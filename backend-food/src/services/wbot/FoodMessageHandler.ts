import { proto, WASocket } from "baileys";
import { v4 as uuidv4 } from "uuid";
import FoodWhatsapp from "../../models/FoodWhatsapp";
import FoodRestaurantConfig from "../../models/FoodRestaurantConfig";

/**
 * Trata mensagens recebidas pelo WhatsApp do restaurante.
 * Comportamento: responde automaticamente com boas-vindas + link do cardápio.
 * Só responde na PRIMEIRA mensagem do cliente (evita spam).
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

    // Verifica se já foi cumprimentado nessa sessão
    if (!greetedNumbers.has(whatsapp.id)) {
      greetedNumbers.set(whatsapp.id, new Set());
    }
    const greeted = greetedNumbers.get(whatsapp.id)!;

    if (greeted.has(jid)) return;
    greeted.add(jid);

    // Extrai telefone do JID quando possível (JIDs regulares: 5511999998888@s.whatsapp.net)
    // Para LID (@lid) não é possível extrair o telefone
    let phone = "";
    if (!jid.endsWith("@lid")) {
      const raw = jid.split("@")[0].split(":")[0].replace(/\D/g, "");
      // Remove DDI 55 para exibir apenas DDD+número no formulário
      phone = raw.startsWith("55") && raw.length >= 12 ? raw.slice(2) : raw;
    }

    // Gera token de sessão vinculado ao JID real do cliente
    const sessionToken = uuidv4();
    jidSessionMap.set(sessionToken, {
      jid,
      whatsappId: whatsapp.id,
      phone,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    });

    const menuUrl = `${process.env.PUBLIC_MENU_BASE_URL}/${config.slug}?session=${sessionToken}`;
    const fullMessage = `${config.welcomeMessage}\n\n🍽️ ${menuUrl}`;

    await wbot.sendMessage(jid, { text: fullMessage });
  } catch (err) {
    console.error("[FoodMessageHandler] Erro ao processar mensagem:", err);
  }
};
