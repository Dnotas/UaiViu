import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";

interface TicketData {
  status?: string;
  companyId?: number;
  unreadMessages?: number;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  groupContact?: Contact
): Promise<Ticket> => {
  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "closed"]
      },
      contactId: groupContact ? groupContact.id : contact.id,
      companyId,
      whatsappId
    },
    order: [["id", "DESC"]]
  });

  // Encontrou pelo whatsappId exato: atualiza conexão normalmente
  if (ticket) {
    await ticket.update({ unreadMessages, whatsappId });
  }

  // Fallback para grupos: busca ticket aberto/pendente sem filtrar por whatsappId.
  // Se a conexão do ticket pertence a outra empresa, corrige para a conexão atual.
  if (!ticket && groupContact) {
    ticket = await Ticket.findOne({
      where: {
        status: { [Op.or]: ["open", "pending"] },
        contactId: groupContact.id,
        companyId
      },
      order: [["id", "DESC"]]
    });

    if (ticket) {
      if (ticket.whatsappId) {
        const ticketConn = await Whatsapp.findOne({ where: { id: ticket.whatsappId } });
        const wrongCompany = !ticketConn || ticketConn.companyId !== companyId;
        await ticket.update(wrongCompany ? { unreadMessages, whatsappId } : { unreadMessages });
      } else {
        await ticket.update({ unreadMessages, whatsappId });
      }
    }
  }

  if (ticket?.status === "closed") {
    await ticket.update({ queueId: null, userId: null });
  }

  if (!ticket && !groupContact) {
    ticket = await Ticket.findOne({
      where: {
        updatedAt: {
          [Op.between]: [+subHours(new Date(), 2), +new Date()]
        },
        contactId: contact.id,
        companyId,
        whatsappId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        companyId
      });
      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
  }

    const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId }
  });

  if (!ticket) {
    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      whatsapp,
      companyId
    });
    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId,
      userId: ticket.userId
    });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  return ticket;
};

export default FindOrCreateTicketService;
