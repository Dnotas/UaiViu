# UaiViu ↔ W-API bridge hardening

## Context

UaiViu's WhatsApp connections normally use Baileys. As of Sept 2026, an
external, unpatched WhatsApp/Baileys protocol bug breaks pairing for every
connection. As a temporary bridge, the "Suporte" connection (`Whatsapp.id
= 31`, `provider = "wapi_bridge"`) routes all sending and receiving through
the paid third-party service W-API (`api.w-api.app`) instead of a real
Baileys socket. This was built incrementally this session:

- `backend/src/helpers/wapiBridgeClient.ts` — thin client for W-API's
  send-text / send-image / send-document / download-media endpoints.
- `backend/src/controllers/WapiWebhookController.ts` — receives W-API's
  incoming-message webhook, creates Contact/Ticket/Message records.
- `backend/src/services/WbotServices/SendWhatsAppMessage.ts`,
  `SendWhatsAppMedia.ts`, `backend/src/helpers/SendMessage.ts` — outgoing
  paths (internal ticket UI + external `/api/messages/send` API used by the
  boss's Java system) branch to the W-API client when
  `whatsapp.provider === "wapi_bridge"`.

Already fixed and verified this session: reconnect/QR-retry lockup bugs in
the original Baileys code (unrelated to the bridge), closed tickets not
reopening on a new incoming message, `fromMe` messages sent directly from
the connected phone never being recorded, a duplicate-ticket bug caused by
WhatsApp's `@lid` masked-id quirk, and a ghost ticket caused by Status/
Stories updates being misread as a real conversation.

**Scope of this spec:** make the single existing "Suporte" bridge
connection solid end-to-end (receive → reply → send file → close ticket).
Generalizing this so other clients/companies can use the same bridge is a
deliberately separate, later project — out of scope here.

## Problem statement

Two confirmed-open defects, in priority order:

1. **Silent message loss (P1).** Some customer text messages never reach
   UaiViu at all. Confirmed via nginx access logs: W-API simply never
   calls `POST /webhook/wapi-bridge` for these messages — it is not our
   code dropping them, W-API's webhook delivery itself has gaps. This is
   the worst class of bug: no error, no trace, agent has no way to know a
   message existed.
2. **Outgoing media broken (P2).** Sending an image or document from the
   UaiViu ticket UI (paperclip → pick file → send) reports success in the
   UaiViu chat, but nothing arrives on real WhatsApp. Plain text sending
   still works. Documents specifically also fail even via a direct `curl`
   call to W-API bypassing our code entirely (confirmed for group chats) —
   at least part of this is a W-API-side issue, not fixable purely in our
   code.

## Approach

### P1 — Reconciliation safety net (not a webhook fix)

We do not control W-API's webhook delivery, so "fix the webhook" is not an
available option. Instead, add a periodic reconciliation job scoped to the
`wapi_bridge` connection:

- Every few minutes, call W-API's chat/message-listing endpoint(s) for the
  connection's recent activity.
- For each message W-API has that isn't yet in UaiViu's `Messages` table
  (matched by W-API's message id), create it retroactively through the
  same `CreateOrUpdateContactService` → `FindOrCreateTicketService` →
  `CreateMessageService` path the webhook uses, including the closed-ticket
  reopen logic.
- This turns "message permanently and silently lost" into "message shows
  up with at most a few minutes' delay," independent of whether W-API ever
  explains or fixes the webhook gap.
- In parallel (not blocking this work): report the gap to W-API support
  with the nginx evidence.

### P2 — Media send investigation, in order

1. **Bisect the regression.** Diff `SendWhatsAppMedia.ts` across this
   session's commits to check whether the change that added document
   support broke the previously-confirmed-working image path.
2. **Isolate document delivery.** Test W-API's `send-document` against a
   private number (not just a group) to determine if the failure is
   group-specific or universal to documents.
3. **Try hosted-URL delivery instead of base64.** W-API's endpoint accepts
   either a base64 payload or a document URL. Since the user has committed
   to W-API as the sole path (no fallback to the old Baileys system), try
   passing a real HTTPS URL into our own `backend/public/` instead of a
   base64 data URI — cheap to test, may sidestep whatever is silently
   rejecting the base64 payload.
4. **If still broken:** stop reporting fake success. Surface a real error
   in the UaiViu UI for the specific media type that's known broken,
   rather than silently pretending it sent, so agents aren't misled.

## Acceptance criteria (end-to-end manual test pass)

1. Customer sends text → appears in Aguardando with correct body.
2. Customer sends audio/image/document → visible/playable in the ticket
   (audio/image already confirmed; document incoming not yet formally
   tested — include in verification).
3. Agent replies text via UaiViu → arrives on real WhatsApp, recorded in
   ticket history.
4. Agent sends image via UaiViu → arrives on real WhatsApp (re-confirm;
   user reported this regressed).
5. Agent sends document/PDF via UaiViu → arrives on real WhatsApp
   (currently broken — the main P2 target).
6. Ticket closed, customer replies again → ticket reopens into Aguardando
   automatically (already fixed and tested this session).
7. Message sent directly from the connected phone (bypassing UaiViu) →
   appears in ticket history (already fixed and tested this session).
8. A message the webhook misses still appears in UaiViu within a few
   minutes via the P1 reconciliation job.
9. The old, now-unused real Baileys "Suporte" session is disconnected/
   removed from Conexões, so the UI reflects that the wapi_bridge
   connection is the one actually in use. Purely a cleanup step, no
   functional dependency.

## Out of scope

- Supporting any WhatsApp connection other than the single existing
  "Suporte" bridge.
- Any UI/onboarding flow for other clients to configure their own W-API
  bridge (explicitly deferred to a future spec per the user).
- Root-causing W-API's webhook delivery gaps or their `send-document`
  failure on their infrastructure — we build around it, we don't fix their
  service.
