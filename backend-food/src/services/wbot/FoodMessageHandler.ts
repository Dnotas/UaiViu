import { proto, WASocket } from "baileys";
import FoodWhatsapp from "../../models/FoodWhatsapp";
import FoodRestaurantConfig from "../../models/FoodRestaurantConfig";

/**
 * Trata mensagens recebidas pelo WhatsApp do restaurante.
 * Comportamento: responde automaticamente com boas-vindas + link do cardápio.
 * Só responde na PRIMEIRA mensagem do cliente (evita spam).
 */

// Cache simples em memória para evitar enviar boas-vindas múltiplas vezes
// para o mesmo número na mesma sessão
const greetedNumbers = new Map<number, Set<string>>();

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

    const menuUrl = `${process.env.PUBLIC_MENU_BASE_URL}/${config.slug}`;
    const fullMessage = `${config.welcomeMessage}\n\n🍽️ ${menuUrl}`;

    await wbot.sendMessage(jid, { text: fullMessage });
  } catch (err) {
    console.error("[FoodMessageHandler] Erro ao processar mensagem:", err);
  }
};
