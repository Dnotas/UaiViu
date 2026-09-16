# UaiViu ↔ W-API Bridge Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the single existing "Suporte" W-API bridge connection (Whatsapp id=31, provider="wapi_bridge") solid end-to-end — receive, reply, send files, close ticket — with no silent message loss and no fake-success sends.

**Architecture:** Two independent fixes on top of the existing bridge code built this session: (1) a periodic reconciliation job that backfills any incoming message W-API's webhook failed to deliver, reusing the exact same Contact/Ticket/Message creation path the webhook uses; (2) a targeted fix to outgoing media sending (image regression + document delivery), verified against real WhatsApp traffic at each step because this codebase has no automated test coverage for this feature.

**Tech Stack:** Express + TypeScript + Sequelize (backend/), Bull/Redis for background jobs, W-API REST API (api.w-api.app) as the WhatsApp transport, PM2 process manager on a Contabo VPS.

**Spec:** `/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/docs/superpowers/specs/2026-09-16-wapi-bridge-hardening-design.md`

## Global Constraints

- Scope is the single "Suporte" connection (`Whatsapp.id = 31`, `provider = "wapi_bridge"`) only — do not generalize to other connections or companies in this plan.
- Every backend code change must go through the real deploy loop before being considered done: `scp` the changed file(s) to `root@13.140.32.124:/home/deploy/uaiviu/backend/src/...`, then `ssh root@13.140.32.124 "chown deploy:deploy <paths> && su - deploy -c 'cd /home/deploy/uaiviu/backend && npm run build 2>&1 | tail -40 && pm2 restart uaiviu-backend'"`. SSH key: `/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa`.
- "Testing" for this feature means live manual verification against real WhatsApp traffic (the user sending/receiving real messages) plus reading PM2 logs — there is no automated test suite for this code path. Do not claim a task done without an observed real-world result.
- Never leave `baileys@<version with the known CVE>` or any secret value printed in full in a shared/logged location.
- Keep using the existing helpers rather than duplicating logic: `wapiBridgeClient.ts` for all W-API HTTP calls, `wapiBridgeRecentSends.ts` for echo dedup, `CreateOrUpdateContactService` → `FindOrCreateTicketService` → `CreateMessageService` for persisting any message (incoming or backfilled).

---

## Task 1: Re-verify and fix the image-send regression

**Files:**
- Modify: `backend/src/services/WbotServices/SendWhatsAppMedia.ts:179-226` (the `wapi_bridge` branch inside `SendWhatsAppMedia`)
- Modify: `backend/src/helpers/wapiBridgeClient.ts` (add debug logging to `wapiBridgeSendImage`, mirroring the existing logging already in `wapiBridgeSendDocument`)

**Interfaces:**
- Consumes: `wapiBridgeSendImage(phone, image, caption?)`, `wapiBridgeSendDocument(phone, document, extension, fileName?, caption?)`, `markWapiBridgeSent(chatNumber)` — all already defined in `wapiBridgeClient.ts` / `wapiBridgeRecentSends.ts`, signatures unchanged.
- Produces: no interface change — this task only fixes behavior inside the existing bridge branch.

The user reported that after document support was added, sending an image from the ticket UI (paperclip → pick file → send) also stopped reaching real WhatsApp, even though it worked earlier this session. Add matching debug logging first — don't guess at the fix before seeing evidence.

- [ ] **Step 1: Add debug logging to `wapiBridgeSendImage`**

In `backend/src/helpers/wapiBridgeClient.ts`, change:

```ts
export const wapiBridgeSendImage = async (
  phone: string,
  image: string,
  caption?: string
): Promise<{ messageId?: string }> => {
  const { data } = await wapi.post(
    `/message/send-image?instanceId=${WAPI_INSTANCE_ID}`,
    { phone, image, ...(caption ? { caption } : {}) },
    { timeout: 60000 }
  );
  return data;
};
```

to:

```ts
export const wapiBridgeSendImage = async (
  phone: string,
  image: string,
  caption?: string
): Promise<{ messageId?: string }> => {
  logger.info(
    `[wapiBridgeSendImage] phone=${phone} caption=${caption} imageLength=${image?.length} imagePrefix=${image?.slice(0, 40)}`
  );
  const { data } = await wapi.post(
    `/message/send-image?instanceId=${WAPI_INSTANCE_ID}`,
    { phone, image, ...(caption ? { caption } : {}) },
    { timeout: 60000 }
  );
  logger.info(`[wapiBridgeSendImage] resposta W-API: ${JSON.stringify(data)}`);
  return data;
};
```

(`logger` is already imported at the top of this file from the earlier `wapiBridgeSendDocument` logging change — reuse it, don't re-import.)

- [ ] **Step 2: Deploy this one file**

```bash
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/helpers/wapiBridgeClient.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/helpers/wapiBridgeClient.ts

ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "chown deploy:deploy /home/deploy/uaiviu/backend/src/helpers/wapiBridgeClient.ts && su - deploy -c 'cd /home/deploy/uaiviu/backend && npm run build 2>&1 | tail -40 && pm2 restart uaiviu-backend'"
```

Expected: `tsc` prints nothing (no type errors), PM2 shows the process restarted.

- [ ] **Step 3: Reproduce live and capture the evidence**

Ask the user to open a ticket on the "Suporte" connection and send ONE image via the ticket UI's paperclip button. While waiting, watch the logs:

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c \"pm2 logs uaiviu-backend --lines 0 --raw\"" 2>&1 | grep --line-buffered -E "wapiBridgeSendImage|SEND MEDIA|Erro ao enviar"
```

Expected one of:
- (a) No `[wapiBridgeSendImage]` line at all → the bridge branch in `SendWhatsAppMedia.ts` isn't being reached (bug is in the branch condition or something upstream, e.g. `whatsappConn?.provider` lookup or `isImage` mime detection). Go to Step 4a.
- (b) `[wapiBridgeSendImage]` logs a call, W-API responds with a real `messageId`, but nothing arrives on WhatsApp → same class of silent W-API-side failure as documents. Go to Step 4b.
- (c) An exception/error is logged → read the exact error and fix that specific cause. Go to Step 4c.

- [ ] **Step 4a (if branch not reached): read and fix the gating logic**

Re-read `backend/src/services/WbotServices/SendWhatsAppMedia.ts:179-187`:

```ts
const whatsappConn = await Whatsapp.findByPk(ticket.whatsappId);
const mimeTypeForBridge = lookup(media.path) || media.mimetype || "";
if (whatsappConn?.provider === "wapi_bridge" && isWapiBridgeConfigured()) {
  const cleanNumber = ticket.contact.number.replace(/\D/g, "");
  const to = ticket.isGroup ? `${cleanNumber}@g.us` : cleanNumber;
  const isImage = mimeTypeForBridge.startsWith("image/");
```

Check specifically: does `lookup(media.path)` (from the `mime-types` package) correctly return `image/jpeg` or `image/png` for the actual uploaded filename multer saved? If the upload extension is missing or unusual, `lookup()` can return `false`, making `mimeTypeForBridge` fall through to `media.mimetype` — confirm what multer actually sets `media.mimetype` to for a browser-uploaded image (should be a real `image/...` string from the browser's `Content-Type`, but verify with a log line: add a temporary `console.log("mimeTypeForBridge", mimeTypeForBridge, "media.mimetype", media.mimetype)` right after line 181, redeploy, reproduce, read the log, then remove the temporary log line once understood). Fix whatever mismatch is found so `isImage` is `true` for real images.

- [ ] **Step 4b (if W-API silently drops it): note as W-API-side, do not attempt further code fix here**

Record the finding (which log line, what response) and move on — this is the same class of issue Task 3 addresses generally via the hosted-URL approach. Do not spend more time on image-specific base64 debugging; Task 3's URL-based approach, if it fixes documents, should be applied to images too as a follow-up (out of this task's scope; note it for the user).

- [ ] **Step 4c (if an exception is thrown): fix the specific exception**

Read the full stack trace from the log (the `catch` block at `SendWhatsAppMedia.ts:223-226` already calls `Sentry.captureException(err)` and re-throws as `AppError` — the PM2 error log will have the real `err.message`). Apply the minimal fix for that specific error. Do not guess — the error message tells you exactly what failed (e.g., a file no longer existing at `media.path`, a bad base64 encode, etc).

- [ ] **Step 5: Re-verify after the fix**

Repeat Step 3's live test. Expected: image arrives on real WhatsApp, and `[wapiBridgeSendImage]` log shows a normal response.

- [ ] **Step 6: Commit**

```bash
cd /Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu
git add backend/src/helpers/wapiBridgeClient.ts backend/src/services/WbotServices/SendWhatsAppMedia.ts
git commit -m "Fix image send regression in wapi_bridge path, add send-image debug logging

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(If Step 4b was the outcome — W-API-side, no code fix — commit only the logging addition from Step 1, with a message noting the finding.)

---

## Task 2: Isolate document send failure — private number vs. group

**Files:** none modified — this is a diagnostic-only task using existing deployed code and direct `curl`.

**Interfaces:**
- Consumes: nothing new.
- Produces: a confirmed answer — "documents fail to all destinations" or "documents fail only to groups" — that Task 3 and Task 4 depend on.

This session already confirmed, via a direct `curl` call to W-API's `send-document` endpoint bypassing all UaiViu code, that a PDF sent to group `120363219384772655@g.us` and to group `120363418161078279@g.us` both returned a "success" response (`messageId` present, HTTP 200) but never arrived on real WhatsApp. Private numbers have not been tested yet.

- [ ] **Step 1: Get a real private WhatsApp number to test against**

Ask the user for a private number they can check personally (their own number, in whatever format — the script below strips non-digits).

- [ ] **Step 2: Send a test document to that private number via curl**

```bash
cat > /tmp/test_send_document_private.sh <<'SCRIPT'
#!/bin/bash
set -e
cd /home/deploy/uaiviu/backend
export $(grep -E '^(WAPI_INSTANCE_ID|WAPI_TOKEN)=' .env | xargs)

PHONE="$1"  # digits only, e.g. 5537999999999
FILE=/home/deploy/uaiviu/backend/public/1789562926144_31260929725859000140550010000006241079746396-nfe.pdf
B64=$(base64 -w0 "$FILE")

curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  "https://api.w-api.app/v1/message/send-document?instanceId=${WAPI_INSTANCE_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${WAPI_TOKEN}" \
  -d "{\"phone\":\"${PHONE}\",\"document\":\"data:application/pdf;base64,${B64}\",\"extension\":\"pdf\",\"fileName\":\"teste-numero-privado.pdf\",\"caption\":\"TESTE PRIVADO - ignore\"}"
SCRIPT
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" /tmp/test_send_document_private.sh root@13.140.32.124:/tmp/test_send_document_private.sh
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "chown deploy:deploy /tmp/test_send_document_private.sh && chmod +x /tmp/test_send_document_private.sh && su - deploy -c 'bash /tmp/test_send_document_private.sh <DIGITS_ONLY_PHONE>'"
```

(Replace `<DIGITS_ONLY_PHONE>` with the real number from Step 1, and confirm the PDF fixture file still exists on the server — if it was cleaned up, substitute any real PDF path under `backend/public/`.)

- [ ] **Step 3: Ask the user to check WhatsApp and record the result**

Two outcomes:
- Arrives on the private number → the failure is **group-specific**. Task 3's hosted-URL fix should be tried against groups specifically, and it's worth re-testing whether base64-to-private-number already works fine as-is (meaning private document sends from the UaiViu UI may already work — verify with a live UI test before assuming Task 3 is required for the private case).
- Does not arrive → the failure is **universal to documents** regardless of destination type. Task 3 must fix both cases.

Document the outcome in the commit message of Task 3 (no code change in this task, so no commit here).

---

## Task 3: Try hosted-URL document delivery instead of base64

**Files:**
- Modify: `backend/src/helpers/wapiBridgeClient.ts` (`wapiBridgeSendDocument` signature and call sites)
- Modify: `backend/src/helpers/SendMessage.ts` (bridge branch, currently builds a base64 data URI)
- Modify: `backend/src/services/WbotServices/SendWhatsAppMedia.ts` (bridge branch, currently builds a base64 data URI)

**Interfaces:**
- Consumes: `BACKEND_URL` env var (already used elsewhere in this codebase, e.g. `Message.ts`'s `mediaUrl` getter: `` `${process.env.BACKEND_URL}/public/${filename}` ``).
- Produces: `wapiBridgeSendDocument(phone: string, documentUrlOrBase64: string, extension: string, fileName?: string, caption?: string)` — same signature, only the *value* passed as the second argument changes at call sites (a real `https://...` URL instead of a `data:...;base64,...` string). No signature change needed since W-API's endpoint accepts either in the same `document` field.

The file being sent is already saved on disk under `backend/public/` (multer saves it there directly — see `backend/src/config/upload.ts`) before either send path reads it into base64. Skip the base64 encode entirely and pass a real URL instead.

- [ ] **Step 1: Change `SendMessage.ts`'s document branch to build a URL instead of base64**

In `backend/src/helpers/SendMessage.ts`, find the bridge branch's document handling (currently):

```ts
if (mimeType.startsWith("image/")) {
  await wapiBridgeSendImage(to, dataUri, messageData.body || undefined);
  mediaType = "image";
} else {
  const nameForExt = messageData.fileName || messageData.mediaPath;
  const extension =
    nameForExt.toLowerCase().split(".").pop() ||
    mimeType.split("/")[1] ||
    "bin";
  await wapiBridgeSendDocument(
    to,
    dataUri,
    extension,
    messageData.fileName,
    messageData.body || undefined
  );
  mediaType = "document";
}
```

Change the document branch (leave the image branch untouched — Task 1 handles images separately) to:

```ts
if (mimeType.startsWith("image/")) {
  await wapiBridgeSendImage(to, dataUri, messageData.body || undefined);
  mediaType = "image";
} else {
  const nameForExt = messageData.fileName || messageData.mediaPath;
  const extension =
    nameForExt.toLowerCase().split(".").pop() ||
    mimeType.split("/")[1] ||
    "bin";
  // W-API aceita link hospedado ou base64 no campo "document" — base64
  // confirmadamente falha em silêncio pra documentos (testado via curl
  // direto); o arquivo já está salvo em backend/public, então manda o
  // link em vez de reencodar.
  const documentUrl = `${process.env.BACKEND_URL}/public/${messageData.mediaPath.split("/").pop()}`;
  await wapiBridgeSendDocument(
    to,
    documentUrl,
    extension,
    messageData.fileName,
    messageData.body || undefined
  );
  mediaType = "document";
}
```

- [ ] **Step 2: Apply the identical change to `SendWhatsAppMedia.ts`'s document branch**

In `backend/src/services/WbotServices/SendWhatsAppMedia.ts`, find:

```ts
if (isImage) {
  await wapiBridgeSendImage(to, dataUri, body || undefined);
} else {
  const extension =
    media.originalname.toLowerCase().split(".").pop() ||
    mimeTypeForBridge.split("/")[1] ||
    "bin";
  await wapiBridgeSendDocument(to, dataUri, extension, media.originalname, body || undefined);
}
```

Change to:

```ts
if (isImage) {
  await wapiBridgeSendImage(to, dataUri, body || undefined);
} else {
  const extension =
    media.originalname.toLowerCase().split(".").pop() ||
    mimeTypeForBridge.split("/")[1] ||
    "bin";
  // Base64 falha em silêncio pra documento (confirmado via curl direto) —
  // o multer já salvou o arquivo em backend/public (media.filename), manda
  // o link em vez do base64.
  const documentUrl = `${process.env.BACKEND_URL}/public/${media.filename}`;
  await wapiBridgeSendDocument(to, documentUrl, extension, media.originalname, body || undefined);
}
```

- [ ] **Step 3: Deploy both files**

```bash
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/helpers/SendMessage.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/helpers/SendMessage.ts

scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/services/WbotServices/SendWhatsAppMedia.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/services/WbotServices/SendWhatsAppMedia.ts

ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "chown deploy:deploy /home/deploy/uaiviu/backend/src/helpers/SendMessage.ts /home/deploy/uaiviu/backend/src/services/WbotServices/SendWhatsAppMedia.ts && su - deploy -c 'cd /home/deploy/uaiviu/backend && npm run build 2>&1 | tail -40 && pm2 restart uaiviu-backend'"
```

Expected: clean `tsc` build, PM2 restarts.

- [ ] **Step 4: Verify `BACKEND_URL` is a real, publicly reachable HTTPS URL**

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 "grep BACKEND_URL /home/deploy/uaiviu/backend/.env"
curl -sI "$(ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 "grep BACKEND_URL /home/deploy/uaiviu/backend/.env | cut -d= -f2")/public/" | head -5
```

Expected: `BACKEND_URL` is `https://backend.uaiviu.com.br` (or equivalent), and the `/public/` path responds (even a 404 for the bare directory is fine — confirms the host/TLS/route work; a connection failure is not fine).

- [ ] **Step 5: Live-test document send to the group that failed before**

Ask the user to send a PDF via the ticket UI to the same group tested earlier this session (`120363219384772655@g.us` / "Multi Fix NFC-e" or similar), or re-run the curl-style test from Task 2 with `document` set to a real `https://.../public/<file>.pdf` URL instead of the base64 data URI. Watch logs:

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c \"pm2 logs uaiviu-backend --lines 0 --raw\"" 2>&1 | grep --line-buffered "wapiBridgeSendDocument"
```

Expected: real delivery on WhatsApp this time. If it still silently fails, this is confirmed as a W-API platform limitation unrelated to payload format — stop here, do not attempt a third encoding variant, and move to Task 4's fallback.

- [ ] **Step 6: Commit**

```bash
cd /Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu
git add backend/src/helpers/SendMessage.ts backend/src/services/WbotServices/SendWhatsAppMedia.ts
git commit -m "Send documents via hosted URL instead of base64 in wapi_bridge

Base64 accepted with HTTP 200 by W-API but silently never delivered
(confirmed via direct curl bypassing our code). Files are already
saved under backend/public/ before this point, so link to them
instead of re-encoding.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: Surface a real failure instead of fake success, if documents are still broken

**Files:**
- Modify: `backend/src/services/WbotServices/SendWhatsAppMedia.ts:188-226` (bridge branch's try/catch)
- Modify: `backend/src/helpers/SendMessage.ts` (bridge branch)

**Interfaces:**
- Consumes: the outcome of Task 3, Step 5.
- Produces: no new interface — changes only whether/how an `AppError` is thrown.

**Only do this task if Task 3 did not fix document delivery.** If Task 3 fixed it, skip this task entirely and mark it not-applicable in the plan tracking.

Right now, both bridge branches call `wapiBridgeSendDocument`, get a "success" response, then unconditionally record the message as sent (`fromMe: true`) in the UaiViu ticket and return success to the caller — even when W-API's own response doesn't guarantee real delivery. Since we cannot distinguish "W-API says 200 and it actually arrives" from "W-API says 200 and it silently vanishes" from the response body alone (both cases return the identical `{instanceId, messageId, insertedId}` shape — confirmed this session), we cannot detect the failure synchronously. The only honest fix available is to stop offering document upload as if it works, until W-API fixes it on their end.

- [ ] **Step 1: Add a visible, actionable warning in the ticket when a document is sent via the bridge**

In `backend/src/services/WbotServices/SendWhatsAppMedia.ts`, inside the bridge branch's `else` (non-image) case, after the `wapiBridgeSendDocument` call succeeds, change the message body used for `CreateMessageService` and `ticket.update` to include a visible caveat, so agents don't assume silent success means delivered:

```ts
} else {
  const extension =
    media.originalname.toLowerCase().split(".").pop() ||
    mimeTypeForBridge.split("/")[1] ||
    "bin";
  const documentUrl = `${process.env.BACKEND_URL}/public/${media.filename}`;
  await wapiBridgeSendDocument(to, documentUrl, extension, media.originalname, body || undefined);
}
```

becomes (only if Task 3 did not resolve delivery):

```ts
} else {
  throw new AppError(
    "Envio de documentos pela ponte W-API está temporariamente indisponível " +
    "(confirmado que a W-API aceita o envio mas não entrega no WhatsApp). " +
    "Envie o arquivo por outro meio até resolvermos isso com o suporte da W-API."
  );
}
```

Apply the same change to the equivalent branch in `backend/src/helpers/SendMessage.ts`.

- [ ] **Step 2: Deploy**

Same deploy commands as Task 3 Step 3, for these two files.

- [ ] **Step 3: Verify the UI now shows a real error**

Ask the user to try sending a PDF via the ticket UI. Expected: an error toast/message appears in the UaiViu UI (via the existing `AppError` → HTTP error response → frontend error toast path already used elsewhere in this codebase) instead of a false "sent" confirmation.

- [ ] **Step 4: Commit**

```bash
cd /Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu
git add backend/src/services/WbotServices/SendWhatsAppMedia.ts backend/src/helpers/SendMessage.ts
git commit -m "Fail loudly on document send via wapi_bridge until W-API fixes delivery

Base64 and hosted-URL both return HTTP 200 from W-API without real
delivery to WhatsApp. Rather than keep reporting fake success,
surface a real error so agents know to use another channel.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Research W-API's message-history/list-chats endpoint

**Files:** none — pure research task, output feeds Task 6.

**Interfaces:**
- Produces: the exact endpoint URL, required query params/body, auth header, and response shape for listing recent messages on an instance — needed as a concrete contract before Task 6 can be written correctly.

- [ ] **Step 1: Open the W-API Postman collection**

Use the chrome-devtools MCP tools (`navigate_page`, `take_snapshot`, `click`) to open `https://www.postman.com/w-api/w-api-api-do-whatsapp/collection/rrpwcf6/w-api-collection`, expand "Instância PRO" → "Chats" (seen in the collection tree this session as a sibling folder to "Message" — contains chat/message-listing endpoints).

- [ ] **Step 2: Find the message-listing endpoint**

Look for an endpoint like "Listar mensagens" or "Buscar mensagens do chat" under Chats or Message queue. Record:
- Exact URL and HTTP method
- Whether it lists messages for the whole instance or requires a specific `chatId`/`phone` param
- Whether it supports a time-range or "since" cursor param (needed to avoid re-fetching the whole history every run)
- The exact response JSON shape: does each message include a `messageId`, `fromMe`, `chat.id`/`phone`, `timestamp`, and the same `msgContent` shape the webhook payload uses (`conversation`, `extendedTextMessage`, `imageMessage`, etc.)?

- [ ] **Step 3: Do a real curl call with actual credentials to confirm the shape**

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c 'cd /home/deploy/uaiviu/backend && export \$(grep -E \"^(WAPI_INSTANCE_ID|WAPI_TOKEN)=\" .env | xargs) && curl -s \"<ENDPOINT_URL_FROM_STEP_2>?instanceId=\${WAPI_INSTANCE_ID}\" -H \"Authorization: Bearer \${WAPI_TOKEN}\"' | head -c 2000"
```

(Fill in `<ENDPOINT_URL_FROM_STEP_2>` and any required params/body from Step 2's findings.)

- [ ] **Step 4: Write down the confirmed contract**

Before starting Task 6, write a short note (in the Task 6 section of this plan, or as a commit message on a throwaway file) with: exact endpoint, params, and 2-3 real fields from the actual response used to map into the same `event`/`instanceId`/`isGroup`/`fromMe`/`chat`/`sender`/`msgContent`/`messageId` shape `WapiWebhookController.ts` already parses — Task 6 should reuse `WapiWebhookController.ts`'s existing extraction helpers (`extractText`, `extractMediaType`, `downloadAndSaveMedia`) rather than re-implementing them, so confirm the listing endpoint's per-message shape is compatible with those helpers' expected input (`msgContent` sub-object per message).

---

## Task 6: Implement the reconciliation job

**Files:**
- Create: `backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts`
- Modify: `backend/src/queues.ts` (register a new recurring Bull job, following the existing pattern used for `sendScheduledMessages`/campaign jobs already in that file)
- Modify: `backend/src/controllers/WapiWebhookController.ts` (export `extractText`, `extractMediaType`, `downloadAndSaveMedia`, and the closed-ticket-reopen block as reusable named exports, since Task 6 must not duplicate this logic)

**Interfaces:**
- Consumes: the endpoint contract confirmed in Task 5; `extractText(msgContent)`, `extractMediaType(msgContent)`, `downloadAndSaveMedia(msgContent, mediaType)` (all currently unexported `const` in `WapiWebhookController.ts` — must become `export const`); `CreateOrUpdateContactService`, `FindOrCreateTicketService`, `CreateMessageService` (all already exported).
- Produces: `reconcileWapiBridgeMessages(): Promise<{ checked: number; backfilled: number }>` — the function Task 6's Bull job calls on each tick; also usable standalone for manual runs/testing.

This task cannot be fully written until Task 5 confirms the real endpoint contract. The steps below assume the endpoint is `POST https://api.w-api.app/v1/chat/messages?instanceId=...` returning `{ messages: [...] }` where each item has the same `msgContent`/`chat`/`sender`/`fromMe`/`messageId` shape as the webhook payload — **update this task's code before implementing if Task 5 found a different shape.**

- [ ] **Step 1: Export the shared extraction helpers from `WapiWebhookController.ts`**

In `backend/src/controllers/WapiWebhookController.ts`, change:

```ts
const extractText = (msgContent: any): string | null => {
```
to
```ts
export const extractText = (msgContent: any): string | null => {
```

Do the same for `extractMediaType` and `downloadAndSaveMedia`. No other changes to this file in this step.

- [ ] **Step 2: Deploy and confirm no build errors from the export changes alone**

```bash
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/controllers/WapiWebhookController.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/controllers/WapiWebhookController.ts
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "chown deploy:deploy /home/deploy/uaiviu/backend/src/controllers/WapiWebhookController.ts && su - deploy -c 'cd /home/deploy/uaiviu/backend && npm run build 2>&1 | tail -40 && pm2 restart uaiviu-backend'"
```

Expected: clean build (adding `export` to existing `const` declarations cannot break anything that already worked).

- [ ] **Step 3: Add a `Message.findOne` existence check helper and write the reconciliation function**

Create `backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts`:

```ts
import axios from "axios";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import Message from "../../models/Message";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { extractText, extractMediaType, downloadAndSaveMedia } from "../../controllers/WapiWebhookController";

const WAPI_INSTANCE_ID = process.env.WAPI_INSTANCE_ID || "";
const WAPI_TOKEN = process.env.WAPI_TOKEN || "";

interface WapiListedMessage {
  messageId: string;
  fromMe: boolean;
  isGroup: boolean;
  chat: { id: string };
  sender?: { id?: string; pushName?: string; profilePicture?: string };
  msgContent: any;
}

// Rede de segurança pro caso do webhook do W-API não chegar (confirmado que
// isso acontece — ver spec 2026-09-16-wapi-bridge-hardening). Roda a cada
// alguns minutos, busca as mensagens recentes direto na W-API e recria
// qualquer uma que não esteja no nosso banco ainda, reusando exatamente a
// mesma lógica de contato/ticket/mensagem que o webhook usa.
export const reconcileWapiBridgeMessages = async (): Promise<{ checked: number; backfilled: number }> => {
  if (!WAPI_INSTANCE_ID || !WAPI_TOKEN) {
    return { checked: 0, backfilled: 0 };
  }

  const whatsapp = await Whatsapp.findOne({ where: { provider: "wapi_bridge" } });
  if (!whatsapp) {
    return { checked: 0, backfilled: 0 };
  }

  // TODO(Task 5 contract): confirmar URL/params reais antes de rodar em produção.
  const { data } = await axios.post(
    `https://api.w-api.app/v1/chat/messages?instanceId=${WAPI_INSTANCE_ID}`,
    {},
    { headers: { Authorization: `Bearer ${WAPI_TOKEN}` }, timeout: 30000 }
  );

  const messages: WapiListedMessage[] = data?.messages || [];
  let backfilled = 0;

  for (const msg of messages) {
    const existing = await Message.findOne({ where: { id: msg.messageId } });
    if (existing) continue;

    const chatNumber = String(msg.chat?.id || "").replace(/\D/g, "");
    if (!chatNumber) continue;
    if (String(msg.chat?.id).includes("status@broadcast") || String(msg.chat?.id).includes("@newsletter")) continue;

    const companyId = whatsapp.companyId;
    const senderNumber = msg.sender?.id ? String(msg.sender.id).replace(/\D/g, "") : "";
    const contactNumber = (!msg.isGroup && !msg.fromMe && senderNumber) ? senderNumber : chatNumber;
    const contactName = (!msg.fromMe && msg.sender?.pushName) ? msg.sender.pushName : contactNumber;

    const contact = await CreateOrUpdateContactService({
      name: contactName,
      number: contactNumber,
      isGroup: !!msg.isGroup,
      companyId,
      whatsappId: whatsapp.id,
      profilePicUrl: (!msg.fromMe && msg.sender?.profilePicture && msg.sender.profilePicture !== "https://") ? msg.sender.profilePicture : undefined
    });

    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id,
      0,
      companyId,
      msg.isGroup ? contact : undefined
    );

    const text = extractText(msg.msgContent);
    const mediaType = extractMediaType(msg.msgContent);
    const caption = msg.msgContent?.imageMessage?.caption || msg.msgContent?.videoMessage?.caption || "";

    let mediaFilename: string | null = null;
    if (mediaType) {
      try {
        const saved = await downloadAndSaveMedia(msg.msgContent, mediaType);
        if (saved) mediaFilename = saved.filename;
      } catch (mediaErr: any) {
        logger.error(`[ReconcileWapiBridge] Falha ao baixar mídia (${mediaType}): ${mediaErr?.message}`);
      }
    }

    const body = text || caption || (mediaType ? `[${mediaType}]` : "Mensagem recebida");
    const frontendMediaType = mediaType === "sticker" ? "image" : mediaType;

    await ticket.update({ lastMessage: body });
    await CreateMessageService({
      messageData: {
        id: msg.messageId,
        ticketId: ticket.id,
        contactId: msg.fromMe ? undefined : contact.id,
        body,
        fromMe: !!msg.fromMe,
        read: !!msg.fromMe,
        ...(frontendMediaType ? { mediaType: frontendMediaType } : {}),
        ...(mediaFilename ? { mediaUrl: mediaFilename } : {})
      },
      companyId
    });

    backfilled += 1;
    logger.info(`[ReconcileWapiBridge] Backfill: mensagem ${msg.messageId} recriada no ticket ${ticket.id}`);
  }

  return { checked: messages.length, backfilled };
};
```

- [ ] **Step 4: Register a recurring Bull job**

In `backend/src/queues.ts`, find where other recurring jobs are scheduled (e.g. the existing `"Serviço de transferencia de tickets"` / campaign-repeat pattern visible in the PM2 logs this session) and add, near the other periodic job registrations:

```ts
import { reconcileWapiBridgeMessages } from "./services/WbotServices/ReconcileWapiBridgeMessages";

// ... inside the same setup function that schedules other repeating jobs ...
messageQueue.add(
  "ReconcileWapiBridge",
  {},
  { repeat: { every: 5 * 60 * 1000 }, removeOnComplete: true }
);
```

And add a handler alongside the existing `handleSendMessage`-style handlers:

```ts
async function handleReconcileWapiBridge() {
  try {
    const result = await reconcileWapiBridgeMessages();
    if (result.backfilled > 0) {
      logger.info(`[ReconcileWapiBridge] ${result.backfilled}/${result.checked} mensagens recriadas`);
    }
  } catch (e: any) {
    Sentry.captureException(e);
    logger.error({ errMessage: e?.message }, "ReconcileWapiBridge: error");
  }
}
```

Register it in the same `messageQueue.process(...)`-style dispatch this file already uses to route job names to handlers (match the existing pattern for `"SendMessage"` → `handleSendMessage`).

- [ ] **Step 5: Deploy**

```bash
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts
scp -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" \
  "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/backend/src/queues.ts" \
  root@13.140.32.124:/home/deploy/uaiviu/backend/src/queues.ts
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "chown deploy:deploy /home/deploy/uaiviu/backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts /home/deploy/uaiviu/backend/src/queues.ts && su - deploy -c 'cd /home/deploy/uaiviu/backend && npm run build 2>&1 | tail -40 && pm2 restart uaiviu-backend'"
```

- [ ] **Step 6: Verify live — force a gap and confirm backfill**

Ask the user to send a message from a phone/number that is NOT going through the normal flow being watched (or, simpler: wait for the natural ~5 minute job tick and check logs for a `[ReconcileWapiBridge]` line). Confirm via DB that message counts are stable (no duplicates created for messages the webhook already handled — the `Message.findOne({ where: { id: msg.messageId } })` check is what prevents this; verify by checking `Messages` row count for a known ticket before and after a reconciliation tick):

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c \"pm2 logs uaiviu-backend --lines 0 --raw\"" 2>&1 | grep --line-buffered "ReconcileWapiBridge"
```

- [ ] **Step 7: Commit**

```bash
cd /Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu
git add backend/src/services/WbotServices/ReconcileWapiBridgeMessages.ts backend/src/queues.ts backend/src/controllers/WapiWebhookController.ts
git commit -m "Add reconciliation job to backfill messages W-API's webhook drops

W-API's webhook confirmed (via nginx access logs) to sometimes never
call our endpoint for real incoming messages. This job polls W-API's
own message history every 5 minutes and recreates anything missing,
reusing the same contact/ticket/message pipeline the webhook uses.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: Verify incoming document/PDF rendering end-to-end

**Files:** none — verification only, using code already built earlier this session (`downloadAndSaveMedia` in `WapiWebhookController.ts` already handles `documentMessage` via `MEDIA_KEY_BY_TYPE`).

**Interfaces:** none new.

- [ ] **Step 1: Ask the user to send a real PDF from their phone to the "Suporte" WhatsApp number/group (as a customer would)**

- [ ] **Step 2: Watch logs during receipt**

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c \"pm2 logs uaiviu-backend --lines 0 --raw\"" 2>&1 | grep --line-buffered -E "WapiWebhook|Falha ao baixar"
```

Expected: a `[WapiWebhook] event=webhookReceived ...` line, no `Falha ao baixar mídia` error.

- [ ] **Step 3: Confirm in the UaiViu ticket UI**

The document should appear as a downloadable/viewable file (not a `[document]` placeholder). If it shows the placeholder only, re-check `downloadAndSaveMedia`'s `MEDIA_KEY_BY_TYPE.document = "documentMessage"` mapping still matches the real WhatsApp `documentMessage` field name in the received `msgContent` (log the raw `msgContent` temporarily if it doesn't match, since document messages can have different possible sub-fields — e.g., `documentWithCaptionMessage` — that the current extraction may not handle; add that as a second key in `MEDIA_KEY_BY_TYPE`/`extractMediaType` if found).

- [ ] **Step 4: If a gap is found, fix `extractMediaType`/`MEDIA_KEY_BY_TYPE` in `WapiWebhookController.ts` and redeploy per the standard deploy loop, then repeat Steps 1-3.**

- [ ] **Step 5: Commit only if a fix was needed**

```bash
cd /Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu
git add backend/src/controllers/WapiWebhookController.ts
git commit -m "Handle <the specific message sub-field found> for incoming documents

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: Disconnect the old, unused Baileys "Suporte" session

**Files:** none — operational UI action, no code change.

**Interfaces:** none.

This is last on purpose: only do it once Tasks 1-7 have been live-verified, so there is zero chance of needing the old session as a fallback mid-investigation.

- [ ] **Step 1: Confirm the wapi_bridge connection is what's actually serving all current traffic**

```bash
ssh -i "/Users/williammartins/Downloads/ERP_SISTEMAS/UaiViu/contabo_rsa" root@13.140.32.124 \
  "su - deploy -c \"bash -c 'cd /home/deploy/uaiviu/backend && export \\\$(grep -E \\\"^(DB_USER|DB_PASS|DB_NAME|DB_HOST|DB_PORT)=\\\" .env | xargs) && PGPASSWORD=\\\"\\\$DB_PASS\\\" psql -h \\\"\\\${DB_HOST:-localhost}\\\" -U \\\"\\\$DB_USER\\\" -d \\\"\\\$DB_NAME\\\" -c \\\"SELECT id, name, provider, status FROM \\\\\\\"Whatsapps\\\\\\\" WHERE id = 31;\\\"'\""
```

Expected: `id=31`, `provider=wapi_bridge`, `status=CONNECTED` (this is the synthetic always-connected status `StartWhatsAppSession.ts` sets for bridge connections — confirms nothing regressed there).

- [ ] **Step 2: In the UaiViu Conexões screen, disconnect/log out the real underlying Baileys session for this same connection (if it still shows a separate QR/session state), or simply confirm no other "Suporte"-named connection exists that's still trying to hold a dead Baileys socket.**

This is a UI click-through the user should do themselves (or walk through together), since it's a one-time cosmetic cleanup with no code involved — verify visually that Conexões no longer shows a stale "disconnected, needs QR" state fighting for attention next to the working bridge connection.

- [ ] **Step 3: No commit — this task has no code change.**

---

## Task 9: Full acceptance walkthrough

**Files:** none — this is the final gate that confirms every acceptance criterion from the spec together, including ones already fixed earlier this session (not just the new work from Tasks 1-8).

**Interfaces:** none.

- [ ] **Step 1: Run through all 9 acceptance criteria from the spec in one sitting, with the user, against the live "Suporte" connection**

1. Send a text message from a real phone to the connection → confirm it appears in Aguardando with the correct body.
2. Send audio, image, and a document from a real phone → confirm all three are playable/viewable in the ticket (not `[audio]`/`[image]`/`[document]` placeholders).
3. Reply with text from the UaiViu ticket UI → confirm it arrives on the real phone and is recorded in the ticket history.
4. Send an image from the UaiViu ticket UI → confirm it arrives on the real phone (this is Task 1's fix — confirm it holds).
5. Send a document/PDF from the UaiViu ticket UI → confirm it arrives on the real phone (Task 3's fix), or confirm a clear error is shown if Task 4's fallback was needed instead.
6. Close a ticket, then send another message from the same real phone → confirm the ticket reopens into Aguardando automatically.
7. Send a message directly from the connected WhatsApp phone (not through UaiViu) → confirm it appears in the ticket history.
8. Manually verify the reconciliation job ran at least once without errors and without creating duplicate messages for anything the webhook already delivered (check `[ReconcileWapiBridge]` log lines from Task 6 over a real time window).
9. Confirm the Conexões screen reflects the wapi_bridge connection as the one in active use (Task 8).

- [ ] **Step 2: Record the result of each of the 9 checks (pass/fail) back to the user in plain language — this is the "then we'll see if it worked or not" checkpoint they asked for.**

No commit for this task — it's a verification gate, not a code change.
