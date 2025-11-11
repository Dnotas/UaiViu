import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import { lookup } from "mime-types";
import formatBody from "../../helpers/Mustache";
import ValidateBrazilianNumber from "../../helpers/ValidateBrazilianNumber";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ar 44100 -ac 2 -b:a 192k ${outputAudio}`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  body?: string
): Promise<any> => {
  const mimeType = lookup(pathMedia) || "";
  const typeMessage = mimeType.split("/")[0];

  try {
    if (!mimeType) {
      throw new Error("Invalid mimetype");
    }
    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body ? body : "",
        fileName: fileName
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = true; //fileName.includes("audio-record-site");
      const convert = await processAudio(pathMedia);
      if (typeAudio) {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      } else {
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : mimeType,
          caption: body ? body : null,
          ptt: true
        };
      }
    } else if (typeMessage === "document") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body ? body : null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.log(e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<WAMessage> => {
  console.log("========================================");
  console.log("📎 [SEND MEDIA] Iniciando envio de mídia");
  console.log("Ticket ID:", ticket.id);
  console.log("Contact Number:", ticket.contact.number);
  console.log("Contact Name:", ticket.contact.name);
  console.log("Is Group:", ticket.isGroup);
  console.log("Media Type:", media.mimetype);
  console.log("Media Name:", media.originalname);

  // ⚠️ VALIDAÇÃO CRÍTICA DE SEGURANÇA ⚠️
  // Validar o número ANTES de enviar a mídia
  console.log("🔒 [SEGURANÇA] Validando número do contato...");
  const validation = ValidateBrazilianNumber(ticket.contact.number);

  console.log("Resultado da validação:", {
    isValid: validation.isValid,
    isGroup: validation.isGroup,
    cleanNumber: validation.cleanNumber,
    errorMessage: validation.errorMessage
  });

  if (!validation.isValid) {
    console.error("❌ [SEGURANÇA] NÚMERO INVÁLIDO DETECTADO!");
    console.error("Ticket ID:", ticket.id);
    console.error("Contact ID:", ticket.contact.id);
    console.error("Número tentado:", ticket.contact.number);
    console.error("Motivo:", validation.errorMessage);
    console.error("========================================\n");

    // BLOQUEAR O ENVIO!
    throw new AppError(
      `⚠️ BLOQUEADO POR SEGURANÇA: ${validation.errorMessage}\n\n` +
      `Apenas números brasileiros (55 + DDD + número) ou grupos são permitidos.\n` +
      `Ticket #${ticket.id} - Contato: ${ticket.contact.name}`
    );
  }

  // Verificar se o isGroup do ticket está consistente com a validação
  if (ticket.isGroup !== validation.isGroup) {
    console.warn("⚠️ [AVISO] Inconsistência detectada:");
    console.warn(`  - ticket.isGroup: ${ticket.isGroup}`);
    console.warn(`  - Número indica grupo: ${validation.isGroup}`);
    console.warn(`  - Corrigindo automaticamente...`);

    // Corrigir o flag isGroup do ticket se necessário
    await ticket.update({ isGroup: validation.isGroup });
    console.log("✅ Flag isGroup corrigido no ticket");
  }

  console.log("✅ [SEGURANÇA] Número validado com sucesso");
  console.log("========================================");

  try {
    const wbot = await GetTicketWbot(ticket);

    const pathMedia = media.path;

    // Detectar tipo de arquivo pela extensão se mimetype for genérico
    let mimetype = media.mimetype;
    let typeMessage = mimetype.split("/")[0];

    // Se mimetype for genérico (octet-stream), detectar pela extensão
    if (mimetype === "application/octet-stream" || typeMessage === "application") {
      const ext = media.originalname.toLowerCase().split('.').pop();
      if (ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp") {
        mimetype = `image/${ext === "jpg" ? "jpeg" : ext}`;
        typeMessage = "image";
      } else if (ext === "mp4" || ext === "avi" || ext === "mov" || ext === "mkv") {
        mimetype = `video/${ext}`;
        typeMessage = "video";
      } else if (ext === "mp3" || ext === "ogg" || ext === "wav" || ext === "m4a") {
        mimetype = `audio/${ext}`;
        typeMessage = "audio";
      }
    }

    let options: AnyMessageContent;
    const bodyMessage = formatBody(body, ticket.contact);

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      const typeAudio = media.originalname.includes("audio-record-site");
      if (typeAudio) {
        const convert = await processAudio(media.path);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : media.mimetype,
          ptt: true
        };
      } else {
        const convert = await processAudioFile(media.path);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: typeAudio ? "audio/mp4" : media.mimetype
        };
      }
    } else if (typeMessage === "document" || typeMessage === "text") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMessage,
        fileName: media.originalname,
        mimetype: media.mimetype
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: bodyMessage
      };
    }

    const number = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    console.log("📞 Número formatado para envio:", number);
    console.log("🔒 [SEGURANÇA] Verificação final:");
    console.log("  - Número limpo:", validation.cleanNumber);
    console.log("  - É grupo:", validation.isGroup);
    console.log("  - Número final:", number);

    const sentMessage = await wbot.sendMessage(number, { ...options });

    console.log("✅ Mídia enviada com sucesso!");
    console.log("Message ID:", sentMessage.key?.id);
    console.log("========================================\n");

    await ticket.update({ lastMessage: bodyMessage });

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
