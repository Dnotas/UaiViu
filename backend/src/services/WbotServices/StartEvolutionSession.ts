import EventEmitter from "events";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import { registerEvolutionEmitter, removeEvolutionEmitter } from "../../libs/wbot";
import {
  evolutionCreateInstance,
  evolutionGetQR,
  evolutionGetStatus,
  evolutionSendText,
  evolutionSendMedia,
  instanceNameFromId,
  isEvolutionConfigured,
} from "../../helpers/evolutionClient";
import { wbotMessageListener } from "./wbotMessageListener";

const POLL_INTERVAL_MS = 3000;
const MAX_QR_RETRIES = 40; // ~2 minutos esperando QR ser escaneado

const buildEvolutionProxy = (whatsapp: Whatsapp): any => {
  const ev = new EventEmitter();
  ev.setMaxListeners(50);
  const instanceName = instanceNameFromId(whatsapp.id);

  const proxy: any = {
    id: whatsapp.id,
    ev,
    sendMessage: async (jid: string, content: any, _options?: any) => {
      try {
        const number = jid.replace(/@.*/, "");
        if (content?.text) {
          const result = await evolutionSendText(instanceName, number, content.text);
          return { key: result.key, status: 1 };
        }
        if (content?.image) {
          const base64 = content.image?.toString("base64");
          if (base64) {
            const result = await evolutionSendMedia(
              instanceName, number, base64, "image/jpeg", content.caption || "", "imagem.jpg"
            );
            return { key: result.key, status: 1 };
          }
        }
        logger.warn(`[Evolution] sendMessage: tipo não suportado para ${jid}`);
        return {
          key: { id: `EV_${Date.now()}`, remoteJid: jid, fromMe: true },
          status: 1,
        };
      } catch (err: any) {
        logger.error(`[Evolution] sendMessage erro: ${err?.message}`);
        throw err;
      }
    },
    groupMetadata: async (jid: string) => ({ id: jid, subject: "", participants: [] }),
    ws: { readyState: 1, on: () => {}, close: () => {} },
    store: null,
    user: { id: `evolution_${whatsapp.id}@s.whatsapp.net`, name: whatsapp.name },
    logout: async () => {},
  };

  return proxy;
};

export const StartEvolutionSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  if (!isEvolutionConfigured()) {
    logger.warn(
      `[Evolution] EVOLUTION_API_URL não configurado — conexão ${whatsapp.id} ignorada`
    );
    return;
  }

  const io = getIO();
  const instanceName = instanceNameFromId(whatsapp.id);
  const webhookUrl = `${process.env.BACKEND_URL}/webhook/evolution`;

  logger.info(`[Evolution] Iniciando sessão ${instanceName} (whatsappId=${whatsapp.id})`);

  await whatsapp.update({ status: "OPENING" });
  io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
    action: "update",
    session: whatsapp,
  });

  // Cria ou garante existência da instância no Evolution API
  await evolutionCreateInstance(instanceName, webhookUrl);

  // Cria proxy socket e registra para uso pelo webhook e pelo SendMessage
  const proxy = buildEvolutionProxy(whatsapp);
  registerEvolutionEmitter(whatsapp.id, proxy);

  // wbotMessageListener escuta events emitidos pelo webhook controller
  await wbotMessageListener(proxy, companyId);

  // Polling de status/QR para atualizar o UaiViu
  pollEvolutionStatus(whatsapp, companyId, proxy);
};

const pollEvolutionStatus = async (
  whatsapp: Whatsapp,
  companyId: number,
  _proxy: any
): Promise<void> => {
  const io = getIO();
  const instanceName = instanceNameFromId(whatsapp.id);
  let qrRetries = 0;
  let lastStatus = "";

  const poll = async () => {
    try {
      const state = await evolutionGetStatus(instanceName);

      if (state !== lastStatus) {
        lastStatus = state;
        logger.info(`[Evolution] Sessão ${instanceName} state: ${state}`);
      }

      if (state === "open") {
        qrRetries = 0;
        if (whatsapp.status !== "CONNECTED") {
          await whatsapp.update({ status: "CONNECTED", qrcode: "" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), status: "CONNECTED", qrcode: "" },
          });
          logger.info(`[Evolution] Sessão ${instanceName} CONECTADA`);
        }
        setTimeout(poll, 15000);
        return;
      }

      if (state === "close") {
        if (whatsapp.status === "CONNECTED") {
          // Sessão que já estava conectada e caiu — marcar como desconectado e parar
          await whatsapp.update({ status: "DISCONNECTED" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), status: "DISCONNECTED" },
          });
          logger.warn(`[Evolution] Sessão ${instanceName} desconectou`);
          removeEvolutionEmitter(whatsapp.id);
          return;
        }
        // Estado inicial após create — acionar conexão chamando /instance/connect
        // que inicia a autenticação e retorna QR inline
        logger.info(`[Evolution] Acionando conexão para ${instanceName}`);
        const qr = await evolutionGetQR(instanceName);
        if (qr) {
          qrRetries++;
          await whatsapp.update({ qrcode: qr, status: "qrcode" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), qrcode: qr, status: "qrcode" },
          });
          logger.info(`[Evolution] QR obtido para ${instanceName} (tentativa ${qrRetries})`);
        }
        setTimeout(poll, POLL_INTERVAL_MS);
        return;
      }

      // state === "connecting" — buscar QR
      const qr = await evolutionGetQR(instanceName);
      if (qr && qr !== whatsapp.qrcode) {
        qrRetries++;
        await whatsapp.update({ qrcode: qr, status: "qrcode" });
        io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
          action: "update",
          session: { ...whatsapp.get({ plain: true }), qrcode: qr, status: "qrcode" },
        });
        logger.info(
          `[Evolution] QR atualizado para ${instanceName} (tentativa ${qrRetries})`
        );
      }

      if (qrRetries >= MAX_QR_RETRIES) {
        logger.warn(
          `[Evolution] QR expirado para ${instanceName} após ${qrRetries} tentativas`
        );
        await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
        removeEvolutionEmitter(whatsapp.id);
        return;
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: any) {
      logger.error(`[Evolution] Erro no polling de ${instanceName}: ${err?.message}`);
      setTimeout(poll, POLL_INTERVAL_MS * 3);
    }
  };

  setTimeout(poll, 2000);
};
