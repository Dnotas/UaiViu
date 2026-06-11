import { proto, WASocket } from "baileys";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import FoodWhatsapp from "../../models/FoodWhatsapp";
import FoodRestaurantConfig from "../../models/FoodRestaurantConfig";
import FoodConversation from "../../models/FoodConversation";
import FoodMessage from "../../models/FoodMessage";
import FoodSession from "../../models/FoodSession";
import { getIO } from "../../libs/socket";

/**
 * Trata mensagens recebidas pelo WhatsApp do restaurante.
 * Comportamento: responde automaticamente com boas-vindas + link do cardápio.
 * Só responde na PRIMEIRA mensagem do cliente (persiste no banco — sobrevive a restarts).
 * Persiste todas as mensagens recebidas no banco para o módulo de Conversas.
 */

// Deduplicação por ID de mensagem — evita processar a mesma mensagem 2x
// (ocorre quando há 2 instâncias wbot ativas temporariamente)
const processedMessageIds = new Set<string>();

/** Busca sessão no banco por token — sobrevive a restarts */
export const getJidBySession = async (token: string): Promise<{ jid: string; whatsappId: number; phone: string } | null> => {
  try {
    const session = await FoodSession.findOne({
      where: { token, expiresAt: { [Op.gt]: new Date() } },
    });
    if (!session) return null;
    return { jid: session.jid, whatsappId: session.whatsappId, phone: session.phone };
  } catch (err) {
    console.error("[FoodSession] Erro ao buscar sessão:", err);
    return null;
  }
};

const extractTextFromMessage = (msg: proto.IWebMessageInfo): string => {
  const m = msg.message;
  if (!m) return "";
  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
  if (m.imageMessage) return m.imageMessage.caption || "📷 Imagem";
  if (m.videoMessage) return m.videoMessage.caption || "🎬 Vídeo";
  if (m.audioMessage) return m.audioMessage.ptt ? "🎤 Áudio" : "🎵 Áudio";
  if (m.documentMessage) return `📄 ${m.documentMessage.fileName || "Documento"}`;
  if (m.stickerMessage) return "🙂 Figurinha";
  if (m.reactionMessage) return `${m.reactionMessage.text || "👍"} (reação)`;
  if (m.buttonsResponseMessage?.selectedDisplayText) return m.buttonsResponseMessage.selectedDisplayText;
  if (m.listResponseMessage?.title) return m.listResponseMessage.title;
  if (m.locationMessage) return "📍 Localização";
  if (m.contactMessage) return `👤 ${m.contactMessage.displayName || "Contato"}`;
  return "📎 Mídia";
};

export const handleFoodMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: WASocket,
  whatsapp: FoodWhatsapp
) => {
  try {
    // Ignora mensagens enviadas por nós (echo do Baileys)
    if (msg.key.fromMe) return;

    // Deduplicação: ignora se essa mensagem já foi processada
    const msgId = msg.key.id || "";
    if (msgId && processedMessageIds.has(msgId)) return;
    if (msgId) {
      processedMessageIds.add(msgId);
      if (processedMessageIds.size > 2000) {
        processedMessageIds.delete(processedMessageIds.values().next().value!);
      }
    }

    const jid = msg.key.remoteJid!;

    // Ignora grupos
    if (jid.endsWith("@g.us")) return;

    const config = await FoodRestaurantConfig.findOne({
      where: { companyId: whatsapp.companyId }
    });

    if (!config) return;

    // Extrai telefone do JID quando possível
    let phone = "";
    if (!jid.endsWith("@lid")) {
      const raw = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
      phone = raw.startsWith("55") && raw.length >= 12 ? raw.slice(2) : raw;
    }

    const pushName: string = (msg as any).pushName || "";

    // ── Persiste conversa e mensagem no banco ──────────────────────────────────
    const body = extractTextFromMessage(msg);
    const timestamp = new Date((msg.messageTimestamp as number) * 1000 || Date.now());

    const [conversation, created] = await FoodConversation.findOrCreate({
      where: { companyId: whatsapp.companyId, customerJid: jid },
      defaults: {
        companyId: whatsapp.companyId,
        whatsappId: whatsapp.id,
        customerJid: jid,
        customerPhone: phone,
        customerName: pushName || phone || jid.split("@")[0],
        lastMessage: body,
        lastMessageAt: timestamp,
        unreadCount: 1,
      },
    });

    if (!created) {
      const updates: any = {
        lastMessage: body,
        lastMessageAt: timestamp,
        unreadCount: (conversation.unreadCount || 0) + 1,
      };
      if (!conversation.customerName && pushName) updates.customerName = pushName;
      if (!conversation.customerPhone && phone) updates.customerPhone = phone;
      // Reabre conversa arquivada quando cliente manda nova mensagem
      if (conversation.closedAt) updates.closedAt = null;
      await conversation.update(updates);
    }

    const savedMessage = await FoodMessage.create({
      conversationId: conversation.id,
      fromMe: false,
      body: body || "(mídia)",
      timestamp,
    });

    // Emite evento socket para o painel em tempo real
    try {
      const io = getIO();
      io.to(`food-company-${whatsapp.companyId}`).emit("food:conversation:message", {
        conversationId: conversation.id,
        message: savedMessage,
        conversation: await conversation.reload(),
      });
    } catch { /* socket pode não estar pronto */ }

    // ── Verifica status da loja antes de responder ────────────────────────────
    const storeStatus = config.storeStatus || "open";

    if (storeStatus === "closed_silent") {
      // Loja fechada sem aviso — salva mensagem no histórico mas não responde
      console.log(`[FoodMessageHandler] Loja fechada (silent) — mensagem recebida de ${jid}, sem resposta`);
      return;
    }

    if (storeStatus === "closed_notice") {
      // Loja fechada com aviso — envia mensagem de fechado (apenas uma vez por conversa aberta)
      if (!conversation.greetedAt && config.closedMessage) {
        await wbot.sendMessage(jid, { text: config.closedMessage });
        const now = new Date();
        // greetedAt aqui serve como "já avisou que está fechado" — será resetado quando reabrir
        await conversation.update({ greetedAt: now });
        try {
          const savedNotice = await FoodMessage.create({
            conversationId: conversation.id,
            fromMe: true,
            body: config.closedMessage,
            timestamp: now,
          });
          await conversation.update({ lastMessage: config.closedMessage, lastMessageAt: now });
          const io = getIO();
          io.to(`food-company-${whatsapp.companyId}`).emit("food:conversation:message", {
            conversationId: conversation.id,
            message: savedNotice,
          });
        } catch { /* não bloqueia se falhar */ }
      }
      return;
    }

    // ── Loja aberta: fluxo normal de boas-vindas ────────────────────────────

    // Se cliente enviou a palavra-chave de divulgação, reseta greetedAt para
    // reenviar o link do cardápio (mesmo que já tenha sido saudado antes)
    if (
      config.divulgationMessage &&
      body.trim().toLowerCase() === config.divulgationMessage.trim().toLowerCase() &&
      conversation.greetedAt
    ) {
      await conversation.update({ greetedAt: null });
    }

    // Se já saudou antes, não envia novamente
    if (conversation.greetedAt) return;

    // Gera token de sessão e persiste no banco (sobrevive a restarts)
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    try {
      await FoodSession.upsert({
        token: sessionToken,
        companyId: whatsapp.companyId,
        jid,
        whatsappId: whatsapp.id,
        phone,
        expiresAt,
      });
    } catch (err) {
      console.error("[FoodSession] Erro ao salvar sessão:", err);
    }

    if (!config.welcomeMessage) {
      // Marca como saudado mesmo sem mensagem para não tentar novamente
      await conversation.update({ greetedAt: new Date() });
      return;
    }

    const menuUrl = `${process.env.PUBLIC_MENU_BASE_URL}/${config.slug}?session=${sessionToken}`;
    const fullMessage = `${config.welcomeMessage}\n\n🍽️ ${menuUrl}`;

    await wbot.sendMessage(jid, { text: fullMessage });

    // Marca como saudado e salva mensagem de boas-vindas
    const now = new Date();
    await conversation.update({ greetedAt: now });

    try {
      const savedWelcome = await FoodMessage.create({
        conversationId: conversation.id,
        fromMe: true,
        body: fullMessage,
        timestamp: now,
      });
      await conversation.update({ lastMessage: fullMessage, lastMessageAt: now });
      const io = getIO();
      io.to(`food-company-${whatsapp.companyId}`).emit("food:conversation:message", {
        conversationId: conversation.id,
        message: savedWelcome,
      });
    } catch { /* não bloqueia se falhar */ }
  } catch (err) {
    console.error("[FoodMessageHandler] Erro ao processar mensagem:", err);
  }
};
