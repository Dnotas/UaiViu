import { getWbot } from "../../libs/wbot";
import BaileysChats from "../../models/BaileysChats";

interface Request {
  whatsappId: number;
  groupNumber: string;
}

/**
 * Reseta a sessão de um grupo específico sem desconectar o WhatsApp
 * Útil quando há problemas de "Bad MAC" ou timeout com grupos específicos
 */
const ResetGroupSession = async ({
  whatsappId,
  groupNumber
}: Request): Promise<void> => {
  console.log("🔄 [RESET GROUP SESSION] Iniciando reset do grupo");
  console.log("WhatsApp ID:", whatsappId);
  console.log("Group Number:", groupNumber);

  try {
    // Formatar o JID do grupo
    const groupJid = groupNumber.includes("@")
      ? groupNumber
      : `${groupNumber}@g.us`;

    console.log("Group JID:", groupJid);

    // 1. Deletar dados do grupo do banco (BaileysChats)
    const deletedCount = await BaileysChats.destroy({
      where: {
        whatsappId: whatsappId,
        jid: groupJid
      }
    });

    console.log(`✅ Deletados ${deletedCount} registros de BaileysChats para o grupo`);

    // 2. Limpar cache de metadados do wbot
    try {
      const wbot = getWbot(whatsappId);

      if (wbot.store?.groupMetadata) {
        delete wbot.store.groupMetadata[groupJid];
        console.log("✅ Cache de metadados do grupo removido do wbot.store");
      }

      // Limpar outros caches relacionados ao grupo se existirem
      if (wbot.store?.chats) {
        delete wbot.store.chats[groupJid];
        console.log("✅ Cache de chat do grupo removido");
      }

      if (wbot.store?.messages) {
        delete wbot.store.messages[groupJid];
        console.log("✅ Cache de mensagens do grupo removido");
      }

    } catch (wbotError) {
      console.log("⚠️  Não foi possível limpar cache do wbot (wbot não encontrado)");
    }

    console.log("✅ [RESET GROUP SESSION] Reset concluído com sucesso");
    console.log("ℹ️  Na próxima mensagem, o grupo será ressincronizado automaticamente");

  } catch (error) {
    console.error("❌ [RESET GROUP SESSION] Erro ao resetar sessão do grupo");
    console.error(error);
    throw error;
  }
};

export default ResetGroupSession;
