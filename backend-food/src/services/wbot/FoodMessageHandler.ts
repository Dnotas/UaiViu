import { proto, WASocket } from "baileys";
import { v4 as uuidv4 } from "uuid";
import FoodWhatsapp from "../../models/FoodWhatsapp";
import FoodRestaurantConfig from "../../models/FoodRestaurantConfig";
import FoodConversation from "../../models/FoodConversation";
import FoodMessage from "../../models/FoodMessage";
import { getIO } from "../../libs/socket";

/**
 * Trata mensagens recebidas pelo WhatsApp do restaurante.
 * Comportamento: responde automaticamente com boas-vindas + link do cardápio.
 * Só responde na PRIMEIRA mensagem do cliente (evita spam).
 * Persiste todas as mensagens recebidas no banco para o módulo de Conversas.
 */

// Cache simples em memória para evitar enviar boas-vindas múltiplas vezes
const greetedNumbers = new Map<number, Set<string>>();

// Mapa de sessionToken → { jid, whatsappId, phone } para envio de confirmações
// Expira em 24h para não crescer indefinidamente
export const jidSessionMap = new Map<string, { jid: string; whatsappId: number; phone: string; expiresAt: number }>();

export const getJidBySession = (token: string) => {
  const entry = jidSessionMap.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    jidSessionMap.delete(token);
    return null;
  }
  return entry;
};

const extractTextFromMessage = (msg: proto.IWebMessageInfo): string => {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    ""
  );
};

export const handleFoodMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: WASocket,
  whatsapp: FoodWhatsapp
) => {
  try {
    const jid = msg.key.remoteJid!;

    // Ignora grupos
    if (jid.endsWith("@g.us")) return;

    const config = await FoodRestaurantConfig.findOne({
      where: { companyId: whatsapp.companyId }
    });

    if (!config) return;

    // Extrai telefone do JID quando possível (JIDs regulares: 5511999998888@s.whatsapp.net)
    // Para LID (@lid) não é possível extrair o telefone
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

    // ── Boas-vindas (apenas primeira vez) ────────────────────────────────────
    if (!greetedNumbers.has(whatsapp.id)) {
      greetedNumbers.set(whatsapp.id, new Set());
    }
    const greeted = greetedNumbers.get(whatsapp.id)!;

    if (greeted.has(jid)) return;
    greeted.add(jid);

    // Gera token de sessão vinculado ao JID real do cliente
    const sessionToken = uuidv4();
    jidSessionMap.set(sessionToken, {
      jid,
      whatsappId: whatsapp.id,
      phone,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    });

    if (!config.welcomeMessage) return;

    const menuUrl = `${process.env.PUBLIC_MENU_BASE_URL}/${config.slug}?session=${sessionToken}`;
    const fullMessage = `${config.welcomeMessage}\n\n🍽️ ${menuUrl}`;

    await wbot.sendMessage(jid, { text: fullMessage });
  } catch (err) {
    console.error("[FoodMessageHandler] Erro ao processar mensagem:", err);
  }
};
