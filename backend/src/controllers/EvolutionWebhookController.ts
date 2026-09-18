import { Request, Response } from "express";
import { getEvolutionEmitter } from "../libs/wbot";
import { whatsappIdFromInstanceName } from "../helpers/evolutionClient";
import Whatsapp from "../models/Whatsapp";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

/**
 * Recebe eventos do Evolution API (Oracle server).
 *
 * Payload esperado (POST /webhook/evolution):
 * {
 *   event: "MESSAGES_UPSERT" | "CONNECTION_UPDATE" | "QRCODE_UPDATED" | ...,
 *   instance: "whats_ev_16",
 *   data: { ... },
 *   apikey: "<EVOLUTION_API_KEY>"
 * }
 */
const EvolutionWebhookController = {
  handle: async (req: Request, res: Response): Promise<Response> => {
    const { event, instance: instanceName, data } = req.body;

    // Segurança: validar apenas o nome da instância (só instâncias nossas são processadas).
    // O Evolution API envia apikey por instância (UUID), não a chave global —
    // verificação por chave foi removida para evitar rejeição de webhooks legítimos.
    logger.info(`[EvolutionWebhook] event=${event} instance=${instanceName}`);

    if (!event || !instanceName || !data) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    const whatsappId = whatsappIdFromInstanceName(instanceName);
    if (!whatsappId) {
      // Instância não gerenciada pelo UaiViu — ignorar silenciosamente
      return res.status(200).json({ ok: false, reason: "unknown_instance" });
    }

    // Eventos de conexão tratados diretamente (sem precisar do proxy)
    if (event === "CONNECTION_UPDATE") {
      await handleConnectionUpdate(whatsappId, data);
      return res.status(200).json({ ok: true });
    }

    if (event === "QRCODE_UPDATED") {
      await handleQrcodeUpdated(whatsappId, data);
      return res.status(200).json({ ok: true });
    }

    // Eventos de mensagens: repassa ao proxy wbotMessageListener
    if (event === "MESSAGES_UPSERT") {
      const proxy = getEvolutionEmitter(whatsappId);
      if (!proxy) {
        logger.warn(
          `[EvolutionWebhook] Nenhum emitter para whatsappId=${whatsappId}`
        );
        return res.status(200).json({ ok: false, reason: "session_not_ready" });
      }

      try {
        // Normaliza para o formato Baileys que wbotMessageListener espera
        const messages = Array.isArray(data) ? data : [data];
        proxy.ev.emit("messages.upsert", { messages, type: "notify" });
        logger.info(
          `[EvolutionWebhook] MESSAGES_UPSERT repassado para whatsappId=${whatsappId}`
        );
      } catch (err: any) {
        logger.error(
          `[EvolutionWebhook] Erro ao repassar evento para whatsappId=${whatsappId}: ${err?.message}`
        );
        return res.status(500).json({ error: err?.message });
      }
    }

    return res.status(200).json({ ok: true });
  },
};

async function handleConnectionUpdate(
  whatsappId: number,
  data: { state?: string }
): Promise<void> {
  const state = data?.state;
  if (!state) return;

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) return;

  const io = getIO();

  if (state === "open") {
    await whatsapp.update({ status: "CONNECTED", qrcode: "" });
    io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
      action: "update",
      session: { ...whatsapp.get({ plain: true }), status: "CONNECTED", qrcode: "" },
    });
    logger.info(`[EvolutionWebhook] whatsappId=${whatsappId} CONECTADO via webhook`);
  } else if (state === "close") {
    // Eventos "close" do webhook são ignorados — podem chegar fora de ordem
    // (retry de eventos que falharam). O polling em StartEvolutionSession
    // detecta desconexão real e atualiza o status corretamente.
    logger.info(`[EvolutionWebhook] whatsappId=${whatsappId} close event ignorado (polling cuida disso)`);
  }
}

async function handleQrcodeUpdated(
  whatsappId: number,
  data: { qrcode?: { code?: string; base64?: string } }
): Promise<void> {
  // Usar o texto bruto do QR ("code"), não o base64 da imagem PNG.
  // O frontend usa uma lib que precisa do texto para renderizar o QR.
  const qr = data?.qrcode?.code || data?.qrcode?.base64;
  if (!qr) return;

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) return;

  await whatsapp.update({ qrcode: qr, status: "qrcode" });

  const io = getIO();
  io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
    action: "update",
    session: { ...whatsapp.get({ plain: true }), qrcode: qr, status: "qrcode" },
  });
  logger.info(`[EvolutionWebhook] QR atualizado para whatsappId=${whatsappId} via webhook`);
}

export default EvolutionWebhookController;
