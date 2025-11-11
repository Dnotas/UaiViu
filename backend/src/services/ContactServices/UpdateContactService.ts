import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";

interface ExtraInfo {
  id?: number;
  name: string;
  value: string;
}
interface ContactData {
  email?: string;
  number?: string;
  name?: string;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
  disableTicket?: boolean;
}

interface Request {
  contactData: ContactData;
  contactId: string;
  companyId: number;
}

const UpdateContactService = async ({
  contactData,
  contactId,
  companyId
}: Request): Promise<Contact> => {
  const { email, name, number, extraInfo, disableBot, disableTicket } = contactData;

  const contact = await Contact.findOne({
    where: { id: contactId },
    attributes: ["id", "name", "number", "email", "companyId", "profilePicUrl", "disableBot", "disableTicket"],
    include: ["extraInfo"]
  });

  if (contact?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  if (!contact) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  // ========================================================================
  // FUSÃO AUTOMÁTICA DE CONTATOS DUPLICADOS
  // ========================================================================
  // Se o número está sendo alterado, verificar se já existe outro contato
  // com esse mesmo número. Se existir, fazer fusão automática.

  if (number && number !== contact.number) {
    console.log("========================================");
    console.log("🔍 [MERGE CONTACTS] Verificando duplicatas...");
    console.log("Contato atual ID:", contactId);
    console.log("Número atual:", contact.number);
    console.log("Novo número:", number);

    const duplicateContact = await Contact.findOne({
      where: {
        number: number,
        companyId: companyId,
        id: { [Op.ne]: contactId } // ID diferente do atual
      }
    });

    if (duplicateContact) {
      console.log("⚠️  [MERGE CONTACTS] DUPLICATA DETECTADA!");
      console.log("Contato duplicado ID:", duplicateContact.id);
      console.log("Nome duplicado:", duplicateContact.name);
      console.log("========================================");
      console.log("🔄 [MERGE CONTACTS] Iniciando fusão automática...");

      // Contar tickets de cada contato
      const ticketsOriginal = await Ticket.count({ where: { contactId: contact.id } });
      const ticketsDuplicate = await Ticket.count({ where: { contactId: duplicateContact.id } });

      console.log(`📊 Contato atual (${contact.name}) tem ${ticketsOriginal} tickets`);
      console.log(`📊 Contato duplicado (${duplicateContact.name}) tem ${ticketsDuplicate} tickets`);

      // Transferir todos os tickets do contato duplicado para o contato atual
      if (ticketsDuplicate > 0) {
        console.log(`🔀 Transferindo ${ticketsDuplicate} tickets do contato duplicado...`);
        await Ticket.update(
          { contactId: contact.id },
          { where: { contactId: duplicateContact.id } }
        );
        console.log("✅ Tickets transferidos com sucesso");
      }

      // Deletar o contato duplicado
      console.log(`🗑️  Deletando contato duplicado (ID: ${duplicateContact.id})...`);
      await duplicateContact.destroy();
      console.log("✅ Contato duplicado deletado");

      console.log("========================================");
      console.log("✅ [MERGE CONTACTS] Fusão concluída com sucesso!");
      console.log(`Total de tickets após fusão: ${ticketsOriginal + ticketsDuplicate}`);
      console.log("========================================");
    } else {
      console.log("✅ [MERGE CONTACTS] Nenhuma duplicata encontrada");
      console.log("========================================");
    }
  }

  if (extraInfo) {
    await Promise.all(
      extraInfo.map(async (info: any) => {
        await ContactCustomField.upsert({ ...info, contactId: contact.id });
      })
    );

    await Promise.all(
      contact.extraInfo.map(async oldInfo => {
        const stillExists = extraInfo.findIndex(info => info.id === oldInfo.id);

        if (stillExists === -1) {
          await ContactCustomField.destroy({ where: { id: oldInfo.id } });
        }
      })
    );
  }

  await contact.update({
    name,
    number,
    email,
    disableBot,
    disableTicket
  });

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl", "disableBot", "disableTicket"],
    include: ["extraInfo"]
  });

  return contact;
};

export default UpdateContactService;
