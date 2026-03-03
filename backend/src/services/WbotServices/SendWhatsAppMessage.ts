import { WAMessage } from "baileys";
import WALegacySocket from "baileys"
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ResetGroupSession from "./ResetGroupSession";
import ValidateBrazilianNumber from "../../helpers/ValidateBrazilianNumber";

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

  // ⚠️ VALIDAÇÃO CRÍTICA DE SEGURANÇA ⚠️
  // Validar o número ANTES de enviar a mensagem
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

    // VALIDAÇÃO ADICIONAL: Verificar se o número formatado está correto
    console.log("🔒 [SEGURANÇA] Verificação final antes do envio:");
    console.log("  - Número limpo:", validation.cleanNumber);
    console.log("  - É grupo:", validation.isGroup);
    console.log("  - Sufixo correto:", validation.isGroup ? "g.us" : "s.whatsapp.net");
    console.log("  - Número final:", number);

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
              message: msgFound.message
            }
          };
          console.log("✅ Mensagem quotada processada");
        }

    }

    console.log("📤 Enviando mensagem via Baileys...");

    let sentMessage: WAMessage;

    // Para grupos, tentar pré-cachear metadados
    if (ticket.isGroup) {
      try {
        console.log("🔍 Pré-carregando metadados do grupo...");
        const metadataPromise = wbot.groupMetadata(number);
        const metadataTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('METADATA_TIMEOUT')), 5000)
        );

        const metadata = await Promise.race([metadataPromise, metadataTimeout]);
        console.log("✅ Metadados do grupo carregados:", metadata ? 'sucesso' : 'falhou');
      } catch (metadataError: any) {
        console.log("⚠️  Não foi possível carregar metadados do grupo:", metadataError?.message);
        console.log("🔄 Continuando sem metadados...");

        // Tentar mockar os metadados básicos no cache do wbot
        if (wbot.store) {
          try {
            const groupMetadata = {
              id: number,
              subject: ticket.contact.name || 'Grupo',
              participants: []
            };
            // Forçar cache dos metadados
            wbot.store.groupMetadata = wbot.store.groupMetadata || {};
            wbot.store.groupMetadata[number] = groupMetadata;
            console.log("✅ Metadados mockados no cache");
          } catch (cacheError) {
            console.log("⚠️  Não foi possível mockar metadados:", cacheError);
          }
        }
      }
    }

    // Primeira tentativa: envio normal
    try {
      const sendTimeout = ticket.isGroup ? 30000 : 60000;
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
      console.log("✅ Mensagem enviada com sucesso!");

    } catch (firstAttemptError: any) {
      // Se for timeout em grupo, resetar sessão e tentar novamente
      if (ticket.isGroup && (firstAttemptError?.message === 'SEND_MESSAGE_TIMEOUT' || firstAttemptError?.message === 'Timed Out')) {
        console.log("⚠️  Timeout ao enviar para grupo");
        console.log("🔄 Resetando sessão do grupo e tentando novamente...");

        try {
          // Resetar sessão do grupo específico
          await ResetGroupSession({
            whatsappId: ticket.whatsappId,
            groupNumber: ticket.contact.number
          });

          console.log("✅ Sessão do grupo resetada");
          console.log("📤 Tentando enviar novamente...");

          // Segunda tentativa após reset
          const secondSendTimeout = 20000; // 20 segundos para segunda tentativa
          const secondSendPromise = wbot.sendMessage(number, {
              text: formatBody(body, ticket.contact)
            },
            {
              ...options
            }
          );

          const secondTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SECOND_TIMEOUT')), secondSendTimeout);
          });

          sentMessage = await Promise.race([secondSendPromise, secondTimeoutPromise]) as WAMessage;
          console.log("✅ Mensagem enviada com sucesso após reset!");

        } catch (secondAttemptError: any) {
          console.error("❌ Falhou também após resetar sessão do grupo");
          console.error("Error:", secondAttemptError?.message);
          throw new AppError("Não foi possível enviar mensagem para este grupo. O grupo pode estar com problemas de sincronização. Tente fechar e reabrir o chamado ou reconectar o WhatsApp.");
        }
      } else {
        // Se não for timeout de grupo, lança o erro original
        console.error("❌ Falhou ao enviar mensagem");
        console.error("Error:", firstAttemptError?.message);
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
