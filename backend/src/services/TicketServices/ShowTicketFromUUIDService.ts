import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Whatsapp from "../../models/Whatsapp";

const ShowTicketUUIDService = async (uuid: string): Promise<Ticket> => {
  console.log("🔍 [ShowTicketUUIDService] Buscando ticket por UUID:", uuid);

  const ticket = await Ticket.findOne({
    where: {
      uuid
    },
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
        attributes: ["id", "name", "color"]
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

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  console.log("✅ [ShowTicketUUIDService] Ticket encontrado:");
  console.log("   - Ticket ID:", ticket.id);
  console.log("   - UUID:", ticket.uuid);
  console.log("   - Contact ID:", ticket.contact?.id);
  console.log("   - Contact Name:", ticket.contact?.name);
  console.log("   - Contact isGroup:", ticket.contact?.isGroup);

  return ticket;
};

export default ShowTicketUUIDService;
