import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import fs from "fs";
import { lookup } from "mime-types";

import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";
import { isWapiBridgeConfigured, wapiBridgeSendText, wapiBridgeSendImage, wapiBridgeSendDocument } from "./wapiBridgeClient";
import { markWapiBridgeSent } from "./wapiBridgeRecentSends";
import { inovaChatSendText, inovaChatSendImageByUrl, inovaChatSendDocumentByUrl } from "./inovaChatBridgeClient";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
  fileName?: string;
  ticketId?: number;
  contactId?: number;
  companyId?: number;
};

// Grupo do WhatsApp usa o sufixo @g.us; contato individual usa @s.whatsapp.net.
// O id de grupo e longo (17-18 digitos) e nunca colide com numero brasileiro,
// que tem 12-13 digitos.
const buildChatId = (number: number | string): string => {
  const raw = String(number);

  // Ja veio com sufixo (ex.: "1203...@g.us"): respeita como esta.
  if (raw.includes("@")) return raw;

  const digits = raw.replace(/\D/g, "");
  return digits.length > 13
    ? `${digits}@g.us`
    : `${digits}@s.whatsapp.net`;
};

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData,
  invisibleCharacter?: string
): Promise<any> => {
  try {
    // Ponte temporaria via W-API (ver helpers/wapiBridgeClient.ts)
    if (whatsapp.provider === "wapi_bridge" && isWapiBridgeConfigured(whatsapp)) {
      const digits = String(messageData.number).replace(/\D/g, "");
      const isGroup = digits.length > 13;
      const to = isGroup ? `${digits}@g.us` : digits;
      let mediaType: string | undefined;
      let mediaFileName: string | undefined;

      if (messageData.mediaPath) {
        const mimeType = lookup(messageData.mediaPath) || "";
        const base64 = fs.readFileSync(messageData.mediaPath, { encoding: "base64" });
        const dataUri = `data:${mimeType};base64,${base64}`;

        if (mimeType.startsWith("image/")) {
          await wapiBridgeSendImage(to, dataUri, messageData.body || undefined, whatsapp);
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
            messageData.body || undefined,
            whatsapp
          );
          mediaType = "document";
        }
        // mediaUrl tem que apontar pro nome físico do arquivo salvo em disco (multer
        // prefixa com timestamp — ver config/upload.ts), não pro nome original do
        // upload: usar fileName aqui gerava um link 404 (Cannot GET /public/...).
        mediaFileName = messageData.mediaPath.split("/").pop();
      } else {
        await wapiBridgeSendText(to, messageData.body, whatsapp);
      }
      markWapiBridgeSent(digits);

      const wbMessageId = `WB_${Date.now()}`;

      // Sem ticketId (ex.: agendamentos antigos) nao da pra registrar a
      // mensagem no chat — envia mesmo assim, so nao aparece no historico.
      if (messageData.ticketId && messageData.companyId) {
        await CreateMessageService({
          messageData: {
            id: wbMessageId,
            ticketId: messageData.ticketId,
            contactId: messageData.contactId,
            body: messageData.body || messageData.fileName || "",
            fromMe: true,
            read: true,
            ...(mediaType ? { mediaType, mediaUrl: mediaFileName } : {})
          },
          companyId: messageData.companyId
        });
      }

      return { key: { id: wbMessageId, remoteJid: to, fromMe: true } };
    }

    // Ponte pra clientes na InovaChat (ver helpers/inovaChatBridgeClient.ts).
    // Diferente do W-API, aqui o token e por conexao (Whatsapp.token), nao
    // uma instancia global unica.
    if (whatsapp.provider === "inovachat_bridge" && whatsapp.token) {
      const digits = String(messageData.number).replace(/\D/g, "");
      let mediaType: string | undefined;
      let mediaFileName: string | undefined;

      if (messageData.mediaPath) {
        const mimeType = lookup(messageData.mediaPath) || "application/octet-stream";
        const documentUrl = `${process.env.BACKEND_URL}/public/${messageData.mediaPath.split("/").pop()}`;
        const fileName = messageData.fileName || documentUrl.split("/").pop() || "arquivo";

        if (mimeType.startsWith("image/")) {
          await inovaChatSendImageByUrl(whatsapp.token, digits, documentUrl, fileName, messageData.body || undefined);
          mediaType = "image";
        } else {
          await inovaChatSendDocumentByUrl(
            whatsapp.token,
            digits,
            documentUrl,
            fileName,
            messageData.body || undefined
          );
          mediaType = "document";
        }
        mediaFileName = messageData.mediaPath.split("/").pop();
      } else {
        await inovaChatSendText(whatsapp.token, digits, messageData.body);
      }

      const icMessageId = `IC_${Date.now()}`;

      if (messageData.ticketId && messageData.companyId) {
        await CreateMessageService({
          messageData: {
            id: icMessageId,
            ticketId: messageData.ticketId,
            contactId: messageData.contactId,
            body: messageData.body || messageData.fileName || "",
            fromMe: true,
            read: true,
            ...(mediaType ? { mediaType, mediaUrl: mediaFileName } : {})
          },
          companyId: messageData.companyId
        });
      }

      return { key: { id: icMessageId, remoteJid: `${digits}@s.whatsapp.net`, fromMe: true } };
    }

    const wbot = await GetWhatsappWbot(whatsapp);
    // Antes era sempre `${number}@s.whatsapp.net`, entao TODO agendamento para
    // grupo falhava (o Schedule ia para status ERRO e a mensagem ficava
    // registrada com ack=1, sem nunca ter sido entregue).
    const chatId = buildChatId(messageData.number);

    let message;

    if (messageData.mediaPath) {
      const options = await getMessageOptions(
        messageData.fileName,
        messageData.mediaPath,
        messageData.body
      );
      if (options) {
        message = await wbot.sendMessage(chatId, {
          ...options
        });
      }
    } else {
      const body = `${invisibleCharacter || "‎"} ${messageData.body}`;
      message = await wbot.sendMessage(chatId, { text: body });
    }

    return message;
  } catch (err: any) {
    // new Error(err) quando err não é um Error de verdade vira "[object Object]"
    // (perde a causa real) — serializa em JSON pra aparecer no log de verdade.
    throw err instanceof Error ? err : new Error(JSON.stringify(err));
  }
};
