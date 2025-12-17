import { Op } from "sequelize";
import Ticket from "./models/Ticket";
import Message from "./models/Message";
import Setting from "./models/Setting";
import { getIO } from "./libs/socket";
import { logger } from "./utils/logger";
import ShowTicketService from "./services/TicketServices/ShowTicketService";

export const CheckUrgentTickets = async (): Promise<void> => {
  try {
    // Verificar se o sistema de urgência está habilitado
    const urgencySetting = await Setting.findOne({
      where: { key: "urgencySystem" }
    });

    if (!urgencySetting || urgencySetting.value !== "enabled") {
      return;
    }

    const io = getIO();
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Buscar tickets abertos e pendentes que podem estar urgentes
    const tickets = await Ticket.findAll({
      where: {
        status: {
          [Op.in]: ["open", "pending"]
        },
        urgentAt: null // Ainda não marcado como urgente
      },
      include: [
        {
          model: Message,
          as: "messages",
          required: true
        }
      ]
    });

    for (const ticket of tickets) {
      // Buscar última mensagem do cliente (fromMe = false)
      const lastClientMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: false
        },
        order: [["createdAt", "DESC"]]
      });

      // Buscar última mensagem nossa (fromMe = true) DEPOIS da mensagem do cliente
      const lastOurResponse = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: true,
          createdAt: {
            [Op.gt]: lastClientMessage?.createdAt || new Date(0)
          }
        },
        order: [["createdAt", "DESC"]]
      });

      // Se cliente mandou mensagem e nós NÃO respondemos
      if (lastClientMessage && !lastOurResponse) {
        // Verificar se já passou 10 minutos desde a mensagem do cliente
        if (lastClientMessage.createdAt <= tenMinutesAgo) {
          // Marcar como urgente
          await ticket.update({
            urgentAt: now
          });

          // Emitir evento socket para notificar frontend
          const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

          io.to(ticket.status)
            .to("notification")
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
              action: "update",
              ticket: currentTicket,
              urgent: true
            });

          logger.info(`Ticket ${ticket.id} marcado como urgente - sem resposta há mais de 10 minutos`);
        }
      }
    }

    // Também verificar tickets que JÁ estão urgentes mas foram respondidos
    const urgentTickets = await Ticket.findAll({
      where: {
        urgentAt: {
          [Op.ne]: null
        }
      }
    });

    for (const ticket of urgentTickets) {
      // Buscar última mensagem do cliente
      const lastClientMessage = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: false
        },
        order: [["createdAt", "DESC"]]
      });

      // Buscar última mensagem nossa DEPOIS da mensagem do cliente
      const lastOurResponse = await Message.findOne({
        where: {
          ticketId: ticket.id,
          fromMe: true,
          createdAt: {
            [Op.gt]: lastClientMessage?.createdAt || new Date(0)
          }
        },
        order: [["createdAt", "DESC"]]
      });

      // Se respondemos ou ticket foi fechado, limpar urgência
      if (lastOurResponse || (ticket.status !== "open" && ticket.status !== "pending")) {
        await ticket.update({
          urgentAt: null,
          lastResponseAt: lastOurResponse?.createdAt || now
        });

        const currentTicket = await ShowTicketService(ticket.id, ticket.companyId);

        io.to(ticket.status)
          .to("notification")
          .to(ticket.id.toString())
          .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket: currentTicket,
            urgent: false
          });

        logger.info(`Ticket ${ticket.id} removido de urgente - respondido ou fechado`);
      }
    }
  } catch (error) {
    logger.error(`Erro ao verificar tickets urgentes: ${error}`);
  }
};
