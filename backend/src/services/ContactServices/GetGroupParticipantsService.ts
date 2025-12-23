import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import { getWbot } from "../../libs/wbot";

interface Participant {
  id: string;
  number: string;
  isAdmin: boolean;
}

interface GroupParticipantsResponse {
  participants: Participant[];
  groupName: string;
}

const GetGroupParticipantsService = async (
  contactId: string | number,
  companyId: number
): Promise<GroupParticipantsResponse> => {
  // Buscar o contato
  const contact = await Contact.findByPk(contactId);

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  if (contact.companyId !== companyId) {
    throw new AppError("Não é possível acessar registro de outra empresa", 403);
  }

  // Verificar se é um grupo
  if (!contact.isGroup) {
    throw new AppError("Este contato não é um grupo", 400);
  }

  // Buscar um ticket ativo para obter o whatsappId
  const ticket = await Ticket.findOne({
    where: { contactId: contact.id },
    order: [["updatedAt", "DESC"]]
  });

  if (!ticket) {
    throw new AppError("Nenhum ticket encontrado para este grupo", 404);
  }

  try {
    // Obter a instância do wbot
    const wbot = getWbot(ticket.whatsappId);

    // Formar o JID do grupo (formato: numero@g.us)
    const groupJid = `${contact.number}@g.us`;

    // Buscar metadados do grupo
    const metadata = await wbot.groupMetadata(groupJid);

    // Formatar participantes
    const participants: Participant[] = metadata.participants.map((participant: any) => ({
      id: participant.id,
      number: participant.id.split('@')[0], // Extrair apenas o número
      isAdmin: participant.admin === 'admin' || participant.admin === 'superadmin'
    }));

    return {
      participants,
      groupName: metadata.subject || contact.name
    };

  } catch (error: any) {
    console.error("❌ Erro ao buscar participantes do grupo:", error);
    throw new AppError(
      `Não foi possível buscar os participantes do grupo: ${error.message}`,
      500
    );
  }
};

export default GetGroupParticipantsService;
