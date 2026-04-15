import { Request, Response } from "express";
import AppError from "../errors/AppError";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import formatBody from "../helpers/Mustache";
import ValidateBrazilianNumber from "../helpers/ValidateBrazilianNumber";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  closeTicket?: true;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  const queues: number[] = [];

  if (profile !== "admin") {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Queue, as: "queues" }]
    });
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues
  });

  SetTicketMessagesAsRead(ticket);

  return res.json({ count, messages, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  console.log("========================================");
  console.log("📥 [MESSAGE CONTROLLER] Recebendo mensagem");
  console.log("Ticket ID:", ticketId);
  console.log("Company ID:", companyId);
  console.log("Body:", body);
  console.log("Has Media:", !!medias);
  console.log("Has Quoted:", !!quotedMsg);

  const ticket = await ShowTicketService(ticketId, companyId);
  console.log("✅ Ticket carregado:");
  console.log("  - Status:", ticket.status);
  console.log("  - WhatsApp ID:", ticket.whatsappId);
  console.log("  - Contact ID:", ticket.contactId);
  console.log("  - Contact Number:", ticket.contact?.number);
  console.log("  - Is Group:", ticket.isGroup);

  SetTicketMessagesAsRead(ticket);

  if (medias) {
    console.log("📎 Enviando mídia...");
    await Promise.all(
      medias.map(async (media: Express.Multer.File, index) => {
        await SendWhatsAppMedia({ media, ticket, body: Array.isArray(body) ? body[index] : body });
      })
    );
    console.log("✅ Mídia enviada");
  } else {
    console.log("📝 Enviando mensagem de texto...");
    const send = await SendWhatsAppMessage({ body, ticket, quotedMsg });
    console.log("✅ Mensagem enviada do controller");
  }
  console.log("========================================\n");

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId);

  const io = getIO();
  io.to(message.ticketId.toString()).emit(`company-${companyId}-appMessage`, {
    action: "update",
    message
  });

  return res.send();
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params as unknown as { whatsappId: number };
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  // LOG: Chamada da API externa
  console.log("========================================");
  console.log("📨 [API EXTERNA] Requisição recebida");
  console.log("Timestamp:", new Date().toISOString());
  console.log("WhatsApp ID:", whatsappId);
  console.log("Número destino:", messageData.number);
  console.log("Mensagem:", messageData.body);
  console.log("Tem mídia?:", !!medias);
  if (medias && medias.length > 0) {
    medias.forEach((media, index) => {
      console.log(`Arquivo ${index + 1}:`, {
        nome: media.originalname,
        mimetype: media.mimetype,
        tamanho: media.size
      });
    });
  }
  console.log("========================================");

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = whatsapp.companyId;

    // ⚠️ VALIDAÇÃO CRÍTICA DE SEGURANÇA ⚠️
    // Validar o número ANTES de criar contato/ticket
    console.log("🔒 [API EXTERNA - SEGURANÇA] Validando número...");
    const validation = ValidateBrazilianNumber(numberToTest);

    console.log("Resultado da validação:", {
      isValid: validation.isValid,
      isGroup: validation.isGroup,
      cleanNumber: validation.cleanNumber,
      errorMessage: validation.errorMessage
    });

    if (!validation.isValid) {
      console.error("❌ [API EXTERNA - SEGURANÇA] NÚMERO INVÁLIDO!");
      console.error("Número tentado:", numberToTest);
      console.error("Motivo:", validation.errorMessage);
      console.error("========================================\n");

      throw new AppError(
        `⚠️ BLOQUEADO POR SEGURANÇA: ${validation.errorMessage}\n\n` +
        `Apenas números brasileiros (55 + DDD + número) ou grupos são permitidos.`
      );
    }

    console.log("✅ [API EXTERNA - SEGURANÇA] Número validado com sucesso");

    // Detectar se é grupo ou contato pessoal
    // Grupos têm IDs longos (ex: 120363142926103927 - ~18 dígitos)
    // Contatos pessoais têm números normais (ex: 5537991470016 - 13 dígitos)
    const cleanNumber = validation.cleanNumber;
    const isGroup = validation.isGroup;

    let number;
    let profilePicUrl;

    if (isGroup) {
      // Para grupos: não valida com CheckContactNumber
      number = cleanNumber;
      profilePicUrl = "";
    } else {
      // Para contatos pessoais: valida com retry (até 3 tentativas com 3s de intervalo)
      let CheckValidNumber: any = null;
      let lastError: any = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`⚠️ [API EXTERNA] CheckContactNumber falhou (tentativa ${attempt}/3): ${err.message}`);
          if (attempt < 3) await new Promise(r => setTimeout(r, 3000));
        }
      }
      if (!CheckValidNumber) throw lastError;
      number = CheckValidNumber.jid.replace(/\D/g, "");
      profilePicUrl = await GetProfilePicUrl(number, companyId);
    }

    const contactData = {
      name: `${number}`,
      number,
      profilePicUrl,
      isGroup: isGroup,
      companyId
    };

    const contact = await CreateOrUpdateContactService(contactData);

    // Se for grupo, o ticket deve ser associado ao grupo (passando contact como groupContact)
    const ticket = await FindOrCreateTicketService(
      contact,
      whatsapp.id!,
      0,
      companyId,
      isGroup ? contact : undefined
    );

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await SendWhatsAppMedia({
            media,
            ticket,
            body: body ? formatBody(body, contact) : media.originalname
          });
        })
      );
    } else {
      await SendWhatsAppMessage({ body: formatBody(body, contact), ticket });

      await ticket.update({
        lastMessage: body,
      });

    }

    if (messageData.closeTicket) {
      setTimeout(async () => {
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId
        });
      }, 1000);
    }

    SetTicketMessagesAsRead(ticket);

    // LOG: Sucesso
    console.log("✅ [API EXTERNA] Mensagem enviada com sucesso");
    console.log("Número:", messageData.number);
    console.log("Ticket ID:", ticket.id);
    console.log("========================================\n");

    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    // LOG: Erro
    console.error("❌ [API EXTERNA] Erro ao enviar mensagem");
    console.error("Número:", messageData.number);
    console.error("Erro:", err.message);
    console.error("========================================\n");

    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const sendMessageFlow = async (
  whatsappId: number,
  body: any,
  req: Request,
  files?: Express.Multer.File[]
): Promise<String> => {
  const messageData = body;
  const medias = files;

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = messageData.companyId;

    const CheckValidNumber = await CheckContactNumber(numberToTest, companyId);
    const number = numberToTest.replace(/\D/g, "");

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },

        { removeOnComplete: false, attempts: 3 }
      );
    }

    return "Mensagem enviada";
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};
