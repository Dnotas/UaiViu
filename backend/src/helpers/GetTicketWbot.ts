import { WASocket } from "baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import { Store } from "../libs/store";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  if (!ticket.whatsappId) {
    if (!ticket.user?.id) {
      throw new AppError("ERR_NO_WHATSAPP_SESSION");
    }
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.user.id);
    await ticket.$set("whatsapp", defaultWhatsapp);
  } else {
    // Verifica se a conexão pertence à empresa do ticket.
    // Se não (ex: ticket criado com conexão de outra empresa), corrige automaticamente.
    const conn = await Whatsapp.findByPk(ticket.whatsappId);
    if (conn && conn.companyId !== ticket.companyId) {
      const correct = await Whatsapp.findOne({
        where: { companyId: ticket.companyId, status: "CONNECTED" }
      });
      if (!correct) throw new AppError("ERR_NO_WHATSAPP_SESSION");
      logger.info(
        `[GetTicketWbot] Ticket ${ticket.id}: conexão ${ticket.whatsappId} (empresa ${conn.companyId}) ` +
        `não pertence à empresa ${ticket.companyId}. Corrigindo para ${correct.id} (${correct.name}).`
      );
      await ticket.update({ whatsappId: correct.id });
    }
  }

  const wbot = getWbot(ticket.whatsappId);
  return wbot;
};

export default GetTicketWbot;
