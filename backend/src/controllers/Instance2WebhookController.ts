import { Request, Response } from "express";
import { getInstance2Emitter } from "../libs/wbot";
import { logger } from "../utils/logger";

/**
 * Recebe eventos de mensagens do whats-instance2 (Oracle server).
 *
 * Payload esperado (POST /api/webhook/instance2):
 * {
 *   token: "<INSTANCE2_WEBHOOK_TOKEN>",
 *   event: "messages.upsert" | "contacts.upsert",
 *   whatsappId: number,
 *   data: { messages: [...], type: "notify" }  // para messages.upsert
 *        | contacts: [...]                      // para contacts.upsert
 * }
 */
const Instance2WebhookController = {
  handle: async (req: Request, res: Response): Promise<Response> => {
    const expectedToken = process.env.INSTANCE2_WEBHOOK_TOKEN;

    // Verifica token de segurança
    const { token, event, whatsappId, data } = req.body;
    if (!expectedToken || token !== expectedToken) {
      return res.status(401).json({ error: "Token inválido" });
    }

    if (!whatsappId || !event || !data) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    const proxy = getInstance2Emitter(Number(whatsappId));
    if (!proxy) {
      logger.warn(
        `[Instance2Webhook] Nenhum emitter registrado para whatsappId=${whatsappId}`
      );
      // Retorna 200 para que a instance2 não fique tentando reenviar
      return res.status(200).json({ ok: false, reason: "session_not_ready" });
    }

    try {
      // Repassa o evento ao EventEmitter proxy — o wbotMessageListener vai processá-lo
      proxy.ev.emit(event, data);
      logger.info(
        `[Instance2Webhook] Evento "${event}" repassado para whatsappId=${whatsappId}`
      );
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      logger.error(
        `[Instance2Webhook] Erro ao repassar evento para whatsappId=${whatsappId}: ${err?.message}`
      );
      return res.status(500).json({ error: err?.message });
    }
  },
};

export default Instance2WebhookController;
