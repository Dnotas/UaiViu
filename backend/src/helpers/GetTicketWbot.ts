import { WASocket } from "baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import { Store } from "../libs/store";
import AppError from "../errors/AppError";

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
  }

  const wbot = getWbot(ticket.whatsappId);
  return wbot;
};

export default GetTicketWbot;
