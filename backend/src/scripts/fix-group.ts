/**
 * Script para corrigir grupo dessincronizado SEM perder mensagens
 *
 * USO:
 * npm run fix-group <numero_do_grupo>
 *
 * Exemplo:
 * npm run fix-group 5537882672691547140617
 */

import BaileysChats from "../models/BaileysChats";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import { getWbot } from "../libs/wbot";

const args = process.argv.slice(2);
const groupNumber = args[0];

if (!groupNumber) {
  console.error("❌ Erro: Forneça o número do grupo");
  console.log("Uso: npm run fix-group <numero_do_grupo>");
  process.exit(1);
}

async function fixGroup() {
  try {
    console.log("🔧 [FIX GROUP] Iniciando correção do grupo");
    console.log("Número do grupo:", groupNumber);
    console.log("==========================================\n");

    // 1. Encontrar o contato
    const contact = await Contact.findOne({
      where: { number: groupNumber }
    });

    if (!contact) {
      console.error("❌ Contato não encontrado com esse número");
      process.exit(1);
    }

    console.log("✅ Contato encontrado:");
    console.log("  - ID:", contact.id);
    console.log("  - Nome:", contact.name);
    console.log("  - Número:", contact.number);
    console.log("  - É grupo:", contact.isGroup);
    console.log("");

    // 2. Encontrar tickets relacionados
    const tickets = await Ticket.findAll({
      where: { contactId: contact.id }
    });

    console.log(`📋 Encontrados ${tickets.length} ticket(s) para este grupo`);
    tickets.forEach(t => {
      console.log(`  - Ticket #${t.id} - Status: ${t.status} - WhatsApp ID: ${t.whatsappId}`);
    });
    console.log("");

    // 3. Limpar cache do Baileys (SEM deletar mensagens!)
    const groupJid = `${groupNumber}@g.us`;

    console.log("🧹 Limpando cache corrompido do Baileys...");
    const deletedBailey = await BaileysChats.destroy({
      where: { jid: groupJid }
    });
    console.log(`✅ Removidos ${deletedBailey} registro(s) de BaileysChats`);
    console.log("");

    // 4. Limpar cache em memória do wbot (se estiver ativo)
    if (tickets.length > 0) {
      const whatsappId = tickets[0].whatsappId;
      try {
        console.log("🔄 Limpando cache em memória do wbot...");
        const wbot = getWbot(whatsappId);

        if (wbot.store) {
          // Limpar metadados
          if (wbot.store.groupMetadata && wbot.store.groupMetadata[groupJid]) {
            delete wbot.store.groupMetadata[groupJid];
            console.log("✅ Cache de metadados removido");
          }

          // Limpar chat
          if (wbot.store.chats && wbot.store.chats[groupJid]) {
            delete wbot.store.chats[groupJid];
            console.log("✅ Cache de chat removido");
          }

          // Limpar presença
          if (wbot.store.presences && wbot.store.presences[groupJid]) {
            delete wbot.store.presences[groupJid];
            console.log("✅ Cache de presença removido");
          }
        }

        console.log("✅ Cache em memória limpo");
      } catch (wbotError) {
        console.log("⚠️  Wbot não encontrado ou não conectado (normal se desconectado)");
      }
    }

    console.log("");
    console.log("✅ [FIX GROUP] Correção concluída com sucesso!");
    console.log("");
    console.log("ℹ️  O que foi feito:");
    console.log("  ✓ Cache corrompido do Baileys foi removido");
    console.log("  ✓ Cache em memória foi limpo");
    console.log("  ✓ Mensagens NÃO foram deletadas");
    console.log("");
    console.log("📱 Próximo passo:");
    console.log("  1. Tente enviar uma mensagem para o grupo");
    console.log("  2. O sistema vai ressincronizar automaticamente");
    console.log("  3. A mensagem deve ser enviada com sucesso");
    console.log("==========================================");

    process.exit(0);

  } catch (error) {
    console.error("❌ Erro ao corrigir grupo:");
    console.error(error);
    process.exit(1);
  }
}

// Executar
fixGroup();
