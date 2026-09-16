import { Request, Response } from "express";
import axios from "axios";
import { writeFile } from "fs/promises";
import { basename, resolve, sep } from "path";
import { logger } from "../utils/logger";
import { getIO } from "../libs/socket";
import Whatsapp from "../models/Whatsapp";
import Queue from "../models/Queue";
import User from "../models/User";
import Contact from "../models/Contact";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import CreateMessageService from "../services/MessageServices/CreateMessageService";
import { wapiBridgeDownloadMedia } from "../helpers/wapiBridgeClient";
import { consumeWapiBridgeEcho } from "../helpers/wapiBridgeRecentSends";

const extractText = (msgContent: any): string | null => {
  if (!msgContent) return null;
  if (typeof msgContent.conversation === "string") return msgContent.conversation;
  if (msgContent.extendedTextMessage?.text) return msgContent.extendedTextMessage.text;
  return null;
};

const extractMediaType = (msgContent: any): string | null => {
  if (!msgContent) return null;
  if (msgContent.imageMessage) return "image";
  if (msgContent.videoMessage) return "video";
  if (msgContent.audioMessage) return "audio";
  if (msgContent.documentMessage) return "document";
  if (msgContent.stickerMessage) return "sticker";
  return null;
};

const MEDIA_KEY_BY_TYPE: Record<string, string> = {
  image: "imageMessage",
  video: "videoMessage",
  audio: "audioMessage",
  document: "documentMessage",
  sticker: "stickerMessage"
};

// Baixa a mídia de verdade do W-API (mediaKey/directPath só dão acesso a um
// link temporário) e salva em backend/public, igual o Baileys normal faz em
// wbotMessageListener.downloadMedia — pra tocar/exibir direto no chamado.
const downloadAndSaveMedia = async (
  msgContent: any,
  mediaType: string
): Promise<{ filename: string; mimeType: string } | null> => {
  const media = msgContent?.[MEDIA_KEY_BY_TYPE[mediaType]];
  if (!media?.mediaKey || !media?.directPath) return null;

  const mimeType: string = media.mimetype || "application/octet-stream";
  // W-API só aceita image/document/audio/video nesse endpoint — sticker é webp (imagem).
  const downloadType = mediaType === "sticker" ? "image" : mediaType;

  const { fileLink } = await wapiBridgeDownloadMedia(
    media.mediaKey,
    media.directPath,
    downloadType,
    mimeType
  );
  if (!fileLink) return null;

  const { data } = await axios.get(fileLink, { responseType: "arraybuffer", timeout: 30000 });

  const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
  // fileName vem do conteúdo da mensagem (controlado pelo remetente do WhatsApp) — nunca
  // usar direto num path: sanitiza pra um basename seguro antes de gravar em disco.
  const safeOriginalName = media.fileName
    ? basename(String(media.fileName)).replace(/[^A-Za-z0-9._-]/g, "_")
    : "";
  const filename = safeOriginalName
    ? `${Date.now()}_${safeOriginalName}`
    : `${Date.now()}.${ext}`;

  const publicDir = resolve(__dirname, "..", "..", "public");
  const target = resolve(publicDir, filename);
  if (!target.startsWith(publicDir + sep)) {
    throw new Error("invalid media filename");
  }

  await writeFile(target, Buffer.from(data));

  return { filename, mimeType };
};

// Recebe eventos do W-API (mensagens da conexão "ponte", enviadas ou recebidas).
// fromMe:true chega tanto quando o UaiViu mesmo mandou (eco do wapiBridgeClient,
// já registrado na hora do envio — precisa ignorar pra não duplicar) quanto
// quando a pessoa manda direto pelo celular do número conectado (nunca passou
// pelo UaiViu — precisa registrar aqui, senão o histórico fica incompleto).
export const receive = async (req: Request, res: Response): Promise<Response> => {
  const payload = req.body || {};

  try {
    const { event, instanceId, isGroup, fromMe, chat, sender, msgContent, messageId } = payload;

    logger.info(
      `[WapiWebhook] event=${event} instanceId=${instanceId} isGroup=${isGroup} fromMe=${fromMe}`
    );

    if (event !== "webhookReceived") {
      return res.status(200).json({ ok: true, skipped: "unknown event" });
    }

    if (!instanceId || !chat?.id) {
      return res.status(200).json({ ok: true, skipped: "missing instanceId/chat" });
    }

    // Status/Stories, newsletters e broadcast lists chegam pelo mesmo webhook mas
    // o chat.id deles não é um número/grupo de verdade (ex.: "status@broadcast")
    // — sem esse filtro, virava um contato/ticket fantasma com número vazio.
    const rawChatId = String(chat.id);
    if (rawChatId.includes("status@broadcast") || rawChatId.includes("@newsletter") || rawChatId.includes("@broadcast")) {
      return res.status(200).json({ ok: true, skipped: "status/newsletter/broadcast chat" });
    }

    // Só existe uma conexão "ponte" hoje — quando houver mais de uma, trocar
    // esse findOne por um mapeamento instanceId -> whatsappId de verdade.
    const whatsapp = await Whatsapp.findOne({
      where: { provider: "wapi_bridge" }
    });

    if (!whatsapp) {
      logger.warn(`[WapiWebhook] Nenhuma conexão wapi_bridge encontrada pra instanceId ${instanceId}`);
      return res.status(200).json({ ok: true, skipped: "no wapi_bridge connection" });
    }

    const companyId = whatsapp.companyId;
    const chatNumber = rawChatId.replace(/\D/g, "");

    if (!chatNumber) {
      logger.warn(`[WapiWebhook] chat.id sem dígitos, ignorando: ${rawChatId}`);
      return res.status(200).json({ ok: true, skipped: "chat id without digits" });
    }

    if (fromMe && consumeWapiBridgeEcho(chatNumber)) {
      return res.status(200).json({ ok: true, skipped: "echo of our own send" });
    }

    // Em chat privado o WhatsApp às vezes reporta o chat.id como @lid (id interno
    // mascarado) em vez do número de telefone real — mesma pessoa vira um
    // contato/ticket novo e separado a cada troca. sender.id normalmente carrega
    // o número de verdade nesses casos, então pra mensagem do cliente (!fromMe)
    // ele tem prioridade. Fora isso (grupo, ou fromMe onde sender é a própria
    // conexão) usa chat.id, que é sempre a outra ponta da conversa.
    const senderNumber = sender?.id ? String(sender.id).replace(/\D/g, "") : "";
    const contactNumber = (!isGroup && !fromMe && senderNumber) ? senderNumber : chatNumber;
    const contactName = (!fromMe && sender?.pushName) ? sender.pushName : contactNumber;

    const contact = await CreateOrUpdateContactService({
      name: contactName,
      number: contactNumber,
      isGroup: !!isGroup,
      companyId,
      whatsappId: whatsapp.id,
      profilePicUrl: (!fromMe && sender?.profilePicture && sender.profilePicture !== "https://") ? sender.profilePicture : undefined
    });

    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id,
      0,
      companyId,
      isGroup ? contact : undefined
    );

    const text = extractText(msgContent);
    const mediaType = extractMediaType(msgContent);
    const caption = msgContent?.imageMessage?.caption || msgContent?.videoMessage?.caption || "";

    let mediaFilename: string | null = null;
    if (mediaType) {
      try {
        const saved = await downloadAndSaveMedia(msgContent, mediaType);
        if (saved) mediaFilename = saved.filename;
      } catch (mediaErr: any) {
        logger.error(`[WapiWebhook] Falha ao baixar mídia (${mediaType}): ${mediaErr?.message}`);
      }
    }

    const body = text || caption || (mediaType ? `[${mediaType}]` : "Mensagem recebida");
    // Frontend só sabe renderizar image/audio/video como mídia de verdade — sticker (webp) entra como image.
    const frontendMediaType = mediaType === "sticker" ? "image" : mediaType;

    await ticket.update({ lastMessage: body });

    await CreateMessageService({
      messageData: {
        id: messageId || `WBIN_${Date.now()}`,
        ticketId: ticket.id,
        contactId: fromMe ? undefined : contact.id,
        body,
        fromMe: !!fromMe,
        read: !!fromMe,
        ...(frontendMediaType ? { mediaType: frontendMediaType } : {}),
        ...(mediaFilename ? { mediaUrl: mediaFilename } : {})
      },
      companyId
    });

    // Mensagem recebida (não fromMe) num ticket resolvido reabre ele (volta pra
    // "pending"/Aguardando), igual o fluxo normal do Baileys faz em
    // wbotMessageListener (verifyMessage/verifyMediaMessage). Mensagem enviada
    // pelo próprio número (fromMe, ex.: direto do celular) não reabre.
    if (!fromMe && ticket.status === "closed") {
      const io = getIO();
      await ticket.update({ status: "pending" });
      await ticket.reload({
        include: [
          { model: Queue, as: "queue" },
          { model: User, as: "user" },
          { model: Contact, as: "contact" }
        ]
      });

      io.to(`company-${ticket.companyId}-closed`)
        .to(`queue-${ticket.queueId}-closed`)
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "delete",
          ticket,
          ticketId: ticket.id
        });

      io.to(`company-${ticket.companyId}-${ticket.status}`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .to(ticket.id.toString())
        .emit(`company-${ticket.companyId}-ticket`, {
          action: "update",
          ticket,
          ticketId: ticket.id
        });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error(`[WapiWebhook] Erro ao processar payload: ${err?.message}`);
    // Sempre 200 pro W-API não ficar re-tentando um evento que vai falhar de novo.
    return res.status(200).json({ ok: false, error: err?.message });
  }
};
