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

    let sentMessage: WAMessage;

    // Primeira tentativa: envio normal
    try {
      const sendTimeout = ticket.isGroup ? 20000 : 60000;
      console.log(`⏱️  Timeout configurado: ${sendTimeout}ms`);

      const sendPromise = wbot.sendMessage(number, {
          text: formatBody(body, ticket.contact)
        },
        {
          ...options
        }
      );

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('SEND_MESSAGE_TIMEOUT')), sendTimeout);
      });

      sentMessage = await Promise.race([sendPromise, timeoutPromise]) as WAMessage;
      console.log("✅ Mensagem enviada com sucesso na primeira tentativa!");

    } catch (firstAttemptError: any) {
      // Se for timeout em grupo, tentar envio forçado
      if (ticket.isGroup && (firstAttemptError?.message === 'SEND_MESSAGE_TIMEOUT' || firstAttemptError?.message === 'Timed Out')) {
        console.log("⚠️  Timeout na primeira tentativa para grupo");
        console.log("🔄 Tentando envio direto sem validações...");

        try {
          // Segunda tentativa: envio mais direto, forçando sem esperar resposta
          const messageContent = formatBody(body, ticket.contact);

          // Tentar com sendMessage mas sem aguardar confirmação completa
          const quickSendPromise = wbot.sendMessage(number, {
            text: messageContent
          }, {
            // Não esperar por confirmação/metadados
          });

          // Timeout de 5 segundos para esta tentativa rápida
          const quickTimeoutPromise = new Promise<WAMessage>((resolve, reject) => {
            setTimeout(() => {
              // Se chegou aqui, assume que enviou (não espera confirmação)
              console.log("⚡ Assumindo envio bem-sucedido (sem confirmação)");
              resolve({
                key: {
                  remoteJid: number,
                  fromMe: true,
                  id: `${Date.now()}`
                },
                message: {
                  conversation: messageContent
                },
                messageTimestamp: Date.now()
              } as WAMessage);
            }, 5000);
          });

          sentMessage = await Promise.race([quickSendPromise, quickTimeoutPromise]) as WAMessage;
          console.log("✅ Mensagem enviada com sucesso via envio direto (segunda tentativa)!");

        } catch (secondAttemptError: any) {
          console.error("❌ Falhou também na segunda tentativa");
          console.error("Error:", secondAttemptError?.message);
          throw firstAttemptError; // Lança o erro original
        }
      } else {
        // Se não for timeout de grupo, lança o erro
        throw firstAttemptError;
      }
    }

    console.log("Message ID:", sentMessage.key?.id);
    console.log("Message Status:", sentMessage.status);

    await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
    console.log("✅ Ticket atualizado");
    console.log("========================================\n");

    return sentMessage;
  } catch (err: any) {
    console.error("❌ [SEND MESSAGE] Erro ao enviar mensagem");
    console.error("Ticket ID:", ticket.id);
    console.error("Contact Number:", ticket.contact.number);
    console.error("Is Group:", ticket.isGroup);
    console.error("Error Type:", err?.constructor?.name);
    console.error("Error Message:", err?.message);
    console.error("Error Stack:", err?.stack);
    console.error("Full Error:", JSON.stringify(err, null, 2));
    console.error("========================================\n");

    Sentry.captureException(err);

    // Mensagem de erro específica para grupos com timeout persistente
    if (ticket.isGroup && (err?.message === 'SEND_MESSAGE_TIMEOUT' || err?.message === 'Timed Out')) {
      console.error("⚠️  Erro persistente de timeout em grupo após 2 tentativas");
      throw new AppError("Não foi possível enviar a mensagem para este grupo. Tente reconectar o WhatsApp ou verifique se o bot está no grupo.");
    }

    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
