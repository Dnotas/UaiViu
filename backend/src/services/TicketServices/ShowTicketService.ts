import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";
import Prompt from "../../models/Prompt";

const ShowTicketService = async (
  id: string | number,
  companyId: number
): Promise<Ticket> => {
  console.log("🔍 [ShowTicketService] Buscando ticket:", id);

  const ticket = await Ticket.findByPk(id, {
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "email", "profilePicUrl", "isGroup"],
        include: ["extraInfo"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      },
      {
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"],
        include: ["prompt", "queueIntegrations"]
      },
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["name"]
      },
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name", "color"]
      }
    ]
  });

  if (ticket?.companyId !== companyId) {
    throw new AppError("Não é possível consultar registros de outra empresa");
  }

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  console.log("✅ [ShowTicketService] Ticket encontrado:");
  console.log("   - Ticket ID:", ticket.id);
  console.log("   - Contact ID:", ticket.contact?.id);
  console.log("   - Contact Name:", ticket.contact?.name);
  console.log("   - Contact isGroup:", ticket.contact?.isGroup);
  console.log("   - Contact completo:", JSON.stringify({
    id: ticket.contact?.id,
    name: ticket.contact?.name,
    number: ticket.contact?.number,
    isGroup: ticket.contact?.isGroup
  }));

  return ticket;
};

export default ShowTicketService;
