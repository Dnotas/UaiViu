import { WAMessage } from "baileys";
import WALegacySocket from "baileys"
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg
}: Request): Promise<WAMessage> => {
  console.log("========================================");
  console.log("🚀 [SEND MESSAGE] Iniciando envio de mensagem");
  console.log("Ticket ID:", ticket.id);
  console.log("Contact Number:", ticket.contact.number);
  console.log("Contact Name:", ticket.contact.name);
  console.log("Is Group:", ticket.isGroup);
  console.log("WhatsApp ID:", ticket.whatsappId);
  console.log("Body:", body);
  console.log("Has Quoted Msg:", !!quotedMsg);

  let options = {};

  try {
    console.log("📱 Obtendo wbot...");
    const wbot = await GetTicketWbot(ticket);
    console.log("✅ Wbot obtido com sucesso");
    console.log("Wbot Status:", wbot?.user?.id || "N/A");

    const number = `${ticket.contact.number}@${
      ticket.isGroup ? "g.us" : "s.whatsapp.net"
    }`;
    console.log("📞 Número formatado:", number);

    if (quotedMsg) {
        console.log("💬 Processando mensagem quotada...");
        const chatMessages = await Message.findOne({
          where: {
            id: quotedMsg.id
          }
        });

        if (chatMessages) {
          const msgFound = JSON.parse(chatMessages.dataJson);

          options = {
            quoted: {
              key: msgFound.key,
              message: {
                extendedTextMessage: msgFound.message.extendedTextMessage
              }
            }
          };
          console.log("✅ Mensagem quotada processada");
        }

    }

    console.log("📤 Enviando mensagem via Baileys...");
    const sentMessage = await wbot.sendMessage(number,{
        text: formatBody(body, ticket.contact)
      },
      {
        ...options
      }
    );

    console.log("✅ Mensagem enviada com sucesso!");
    console.log("Message ID:", sentMessage.key?.id);
    console.log("Message Status:", sentMessage.status);

    await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
    console.log("✅ Ticket atualizado");
    console.log("========================================\n");

    return sentMessage;
  } catch (err) {
    console.error("❌ [SEND MESSAGE] Erro ao enviar mensagem");
    console.error("Ticket ID:", ticket.id);
    console.error("Contact Number:", ticket.contact.number);
    console.error("Error Type:", err?.constructor?.name);
    console.error("Error Message:", err?.message);
    console.error("Error Stack:", err?.stack);
    console.error("Full Error:", JSON.stringify(err, null, 2));
    console.error("========================================\n");

    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
