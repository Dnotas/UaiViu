import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import AppError from "../../errors/AppError";
import { getWbot } from "../../libs/wbot";
import { Op } from "sequelize";

interface Participant {
  id: string;
  number: string;
  name: string;
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

    // Extrair números dos participantes
    const participantNumbers = metadata.participants.map((participant: any) => {
      // Extrair apenas os dígitos do JID
      const number = participant.id.replace(/\D/g, "");
      return number;
    });

    // Buscar contatos na base de dados
    const contacts = await Contact.findAll({
      where: {
        number: {
          [Op.in]: participantNumbers
        },
        companyId
      }
    });

    // Criar um mapa de número -> contato para facilitar a busca
    const contactMap = new Map();
    contacts.forEach(c => {
      contactMap.set(c.number, c);
    });

    // Formatar participantes
    const participants: Participant[] = metadata.participants.map((participant: any) => {
      const number = participant.id.replace(/\D/g, "");
      const contactInfo = contactMap.get(number);

      return {
        id: participant.id,
        number: number,
        name: contactInfo ? contactInfo.name : number, // Usar nome do contato ou número
        isAdmin: participant.admin === 'admin' || participant.admin === 'superadmin'
      };
    });

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
