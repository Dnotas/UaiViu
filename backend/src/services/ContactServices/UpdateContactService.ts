import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
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

      // Buscar tickets de cada contato
      const ticketsOriginal = await Ticket.findAll({ where: { contactId: contact.id } });
      const ticketsDuplicate = await Ticket.findAll({ where: { contactId: duplicateContact.id } });

      console.log(`📊 Contato atual (${contact.name}) tem ${ticketsOriginal.length} tickets`);
      console.log(`📊 Contato duplicado (${duplicateContact.name}) tem ${ticketsDuplicate.length} tickets`);

      // Processar cada ticket do contato duplicado
      if (ticketsDuplicate.length > 0) {
        console.log(`🔀 Processando ${ticketsDuplicate.length} tickets do contato duplicado...`);

        for (const ticketDup of ticketsDuplicate) {
          // Verificar se já existe um ticket com o mesmo whatsappId e companyId no contato atual
          const conflictingTicket = ticketsOriginal.find(
            t => t.whatsappId === ticketDup.whatsappId && t.companyId === ticketDup.companyId
          );

          if (conflictingTicket) {
            console.log(`⚠️  Ticket #${ticketDup.id} conflita com ticket #${conflictingTicket.id}`);
            console.log(`📝 Transferindo mensagens do ticket #${ticketDup.id} para #${conflictingTicket.id}...`);

            // Transferir todas as mensagens do ticket duplicado para o ticket conflitante
            const messagesTransferred = await Message.update(
              { ticketId: conflictingTicket.id },
              { where: { ticketId: ticketDup.id } }
            );

            console.log(`✅ ${messagesTransferred[0]} mensagens transferidas`);

            // Deletar o ticket duplicado
            console.log(`🗑️  Deletando ticket duplicado #${ticketDup.id}...`);
            await ticketDup.destroy();
            console.log(`✅ Ticket #${ticketDup.id} deletado`);

          } else {
            console.log(`✅ Ticket #${ticketDup.id} não conflita, transferindo...`);
            // Não há conflito, pode transferir normalmente
            await ticketDup.update({ contactId: contact.id });
            console.log(`✅ Ticket #${ticketDup.id} transferido`);
          }
        }

        console.log("✅ Todos os tickets processados com sucesso");
      }

      // Deletar o contato duplicado
      console.log(`🗑️  Deletando contato duplicado (ID: ${duplicateContact.id})...`);
      await duplicateContact.destroy();
      console.log("✅ Contato duplicado deletado");

      // Contar tickets finais
      const ticketsFinal = await Ticket.count({ where: { contactId: contact.id } });

      console.log("========================================");
      console.log("✅ [MERGE CONTACTS] Fusão concluída com sucesso!");
      console.log(`Tickets antes: ${ticketsOriginal.length}`);
      console.log(`Tickets do duplicado: ${ticketsDuplicate.length}`);
      console.log(`Tickets após fusão: ${ticketsFinal}`);
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
