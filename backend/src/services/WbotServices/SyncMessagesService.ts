import { WASocket, proto, delay } from "baileys";
import { getWbot } from "../../libs/wbot";
import Message from "../../models/Message";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { logger } from "../../utils/logger";
import { handleMessage } from "./wbotMessageListener";

interface ISyncResult {
  success: boolean;
  contactId?: number;
  contactName: string;
  contactNumber: string;
  messagesInWhatsApp: number;
  messagesInDatabase: number;
  missingMessages: number;
  syncedMessages: number;
  errors: string[];
}

/**
 * Serviço para sincronizar mensagens do WhatsApp que podem ter sido perdidas
 * Útil para recuperar mensagens que não foram processadas adequadamente
 */
class SyncMessagesService {
  /**
   * Verifica se há mensagens no WhatsApp que não estão no banco de dados
   */
  async checkSync(
    contactId: number,
    companyId: number,
    whatsappId: number
  ): Promise<ISyncResult> {
    const errors: string[] = [];

    try {
      // Buscar contato
      const contact = await Contact.findOne({
        where: { id: contactId, companyId }
      });

      if (!contact) {
        throw new Error(`Contato não encontrado: ${contactId}`);
      }

      // Obter conexão WhatsApp
      const wbot = getWbot(whatsappId) as WASocket;

      if (!wbot) {
        throw new Error(`Conexão WhatsApp não encontrada: ${whatsappId}`);
      }

      // Buscar mensagens do WhatsApp
      const chatId = `${contact.number}@s.whatsapp.net`;

      let whatsappMessages: proto.IWebMessageInfo[] = [];

      try {
        // Buscar mensagens do store local
        const store = (wbot as any).store;

        if (store && store.messages && store.messages[chatId]) {
          whatsappMessages = store.messages[chatId].array || [];
        } else {
          // Se não houver mensagens no store, tentar carregar
          if (store && store.loadMessages) {
            whatsappMessages = await store.loadMessages(chatId, 100, undefined, wbot);
          }
        }
      } catch (error) {
        errors.push(`Erro ao buscar mensagens do WhatsApp: ${error}`);
        logger.error(`Erro ao buscar mensagens do WhatsApp para contato ${contact.number}: ${error}`);
      }

      // Buscar mensagens do banco de dados
      const dbMessages = await Message.findAll({
        where: {
          contactId: contact.id,
          companyId
        },
        order: [["timestamp", "DESC"]],
        limit: 100
      });

      // Verificar quais mensagens do WhatsApp não estão no banco
      const dbMessageIds = new Set(dbMessages.map(m => m.id));
      const missingMessages = whatsappMessages.filter(
        m => m.key.id && !dbMessageIds.has(m.key.id)
      );

      return {
        success: true,
        contactId: contact.id,
        contactName: contact.name,
        contactNumber: contact.number,
        messagesInWhatsApp: whatsappMessages.length,
        messagesInDatabase: dbMessages.length,
        missingMessages: missingMessages.length,
        syncedMessages: 0,
        errors
      };
    } catch (error) {
      logger.error(`Erro ao verificar sincronização de mensagens: ${error}`);
      errors.push(`Erro geral: ${error}`);

      return {
        success: false,
        contactName: "",
        contactNumber: "",
        messagesInWhatsApp: 0,
        messagesInDatabase: 0,
        missingMessages: 0,
        syncedMessages: 0,
        errors
      };
    }
  }

  /**
   * Sincroniza mensagens ausentes do WhatsApp para o banco de dados
   */
  async syncMessages(
    contactId: number,
    companyId: number,
    whatsappId: number,
    limit: number = 50
  ): Promise<ISyncResult> {
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      // Buscar contato
      const contact = await Contact.findOne({
        where: { id: contactId, companyId }
      });

      if (!contact) {
        throw new Error(`Contato não encontrado: ${contactId}`);
      }

      // Obter conexão WhatsApp
      const wbot = getWbot(whatsappId) as WASocket;

      if (!wbot) {
        throw new Error(`Conexão WhatsApp não encontrada: ${whatsappId}`);
      }

      // Buscar mensagens do WhatsApp
      const chatId = contact.isGroup
        ? `${contact.number}@g.us`
        : `${contact.number}@s.whatsapp.net`;

      let whatsappMessages: proto.IWebMessageInfo[] = [];

      try {
        // Buscar mensagens do store local
        const store = (wbot as any).store;

        if (store && store.messages && store.messages[chatId]) {
          whatsappMessages = store.messages[chatId].array || [];
          // Limitar ao número solicitado
          if (whatsappMessages.length > limit) {
            whatsappMessages = whatsappMessages.slice(0, limit);
          }
        } else {
          // Se não houver mensagens no store, tentar carregar
          if (store && store.loadMessages) {
            whatsappMessages = await store.loadMessages(chatId, limit, undefined, wbot);
          }
        }
      } catch (error) {
        errors.push(`Erro ao buscar mensagens do WhatsApp: ${error}`);
        logger.error(`Erro ao buscar mensagens do WhatsApp para contato ${contact.number}: ${error}`);
      }

      // Buscar mensagens do banco de dados
      const dbMessages = await Message.findAll({
        where: {
          contactId: contact.id,
          companyId
        }
      });

      // Verificar quais mensagens do WhatsApp não estão no banco
      const dbMessageIds = new Set(dbMessages.map(m => m.id));
      const missingMessages = whatsappMessages.filter(
        m => m.key.id && !dbMessageIds.has(m.key.id)
      );

      logger.info(
        `Sincronizando ${missingMessages.length} mensagens ausentes para contato ${contact.name} (${contact.number})`
      );

      // Processar cada mensagem ausente
      for (const message of missingMessages) {
        try {
          // Adicionar delay para não sobrecarregar
          await delay(100);

          // Processar mensagem usando a mesma lógica do listener
          await handleMessage(message, wbot as any, companyId);
          syncedCount++;

          logger.info(
            `Mensagem sincronizada com sucesso - ID: ${message.key.id} - Contato: ${contact.number}`
          );
        } catch (error) {
          const errorMsg = `Erro ao sincronizar mensagem ${message.key.id}: ${error}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      return {
        success: true,
        contactId: contact.id,
        contactName: contact.name,
        contactNumber: contact.number,
        messagesInWhatsApp: whatsappMessages.length,
        messagesInDatabase: dbMessages.length,
        missingMessages: missingMessages.length,
        syncedMessages: syncedCount,
        errors
      };
    } catch (error) {
      logger.error(`Erro ao sincronizar mensagens: ${error}`);
      errors.push(`Erro geral: ${error}`);

      return {
        success: false,
        contactName: "",
        contactNumber: "",
        messagesInWhatsApp: 0,
        messagesInDatabase: 0,
        missingMessages: 0,
        syncedMessages: 0,
        errors
      };
    }
  }

  /**
   * Sincroniza mensagens de um ticket específico
   */
  async syncTicketMessages(
    ticketId: number,
    companyId: number,
    limit: number = 50
  ): Promise<ISyncResult> {
    try {
      const ticket = await Ticket.findOne({
        where: { id: ticketId, companyId },
        include: [{ model: Contact, as: "contact" }]
      });

      if (!ticket) {
        throw new Error(`Ticket não encontrado: ${ticketId}`);
      }

      return await this.syncMessages(
        ticket.contactId,
        companyId,
        ticket.whatsappId,
        limit
      );
    } catch (error) {
      logger.error(`Erro ao sincronizar mensagens do ticket: ${error}`);

      return {
        success: false,
        contactName: "",
        contactNumber: "",
        messagesInWhatsApp: 0,
        messagesInDatabase: 0,
        missingMessages: 0,
        syncedMessages: 0,
        errors: [`Erro geral: ${error}`]
      };
    }
  }
}

export default SyncMessagesService;
