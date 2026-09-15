import EventEmitter from "events";
import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";
import { getIO } from "../../libs/socket";
import { registerInstance2Emitter, removeInstance2Emitter } from "../../libs/wbot";
import {
  instance2StartSession,
  instance2GetQR,
  instance2GetStatus,
  instance2SendText,
  instance2SendMedia,
  sessionNameFromId,
  isInstance2Configured,
} from "../../helpers/instance2Client";
import { wbotMessageListener } from "./wbotMessageListener";

// Polling interval para checar status/QR na instance2
const POLL_INTERVAL_MS = 3000;
const MAX_QR_RETRIES = 40; // ~2 minutos esperando QR ser escaneado

// Cria um EventEmitter que imita a interface mínima de WASocket
// usada por wbotMessageListener (wbot.ev.on / wbot.id / wbot.sendMessage)
const buildProxySocket = (whatsapp: Whatsapp): any => {
  const ev = new EventEmitter();
  ev.setMaxListeners(50);
  const sessionName = sessionNameFromId(whatsapp.id);

  const proxy: any = {
    id: whatsapp.id,
    ev,
    // sendMessage usado por wbotMessageListener para respostas automáticas (bots, queues)
    sendMessage: async (jid: string, content: any, _options?: any) => {
      try {
        const number = jid.replace(/@.*/, "");
        if (content?.text) {
          const result = await instance2SendText(sessionName, number, content.text);
          return { key: result.key, status: 1 };
        }
        if (content?.image) {
          const base64 = content.image?.toString("base64");
          if (base64) {
            const result = await instance2SendMedia(sessionName, number, base64, "image/jpeg", content.caption || "", "imagem.jpg");
            return { key: result.key, status: 1 };
          }
        }
        // Fallback: loga e retorna key sintética
        logger.warn(`[Instance2] sendMessage: tipo não suportado para ${jid}`);
        return { key: { id: `I2_${Date.now()}`, remoteJid: jid, fromMe: true }, status: 1 };
      } catch (err: any) {
        logger.error(`[Instance2] sendMessage erro: ${err?.message}`);
        throw err;
      }
    },
    groupMetadata: async (jid: string) => ({ id: jid, subject: "", participants: [] }),
    ws: {
      readyState: 1,
      on: () => {},
      close: () => {},
    },
    store: null,
    user: { id: `instance2_${whatsapp.id}@s.whatsapp.net`, name: whatsapp.name },
    logout: async () => {},
  };

  return proxy;
};

export const StartInstance2Session = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  if (!isInstance2Configured()) {
    logger.warn(`[Instance2] INSTANCE2_URL não configurado — conexão ${whatsapp.id} ignorada`);
    return;
  }

  const io = getIO();
  const sessionName = sessionNameFromId(whatsapp.id);

  logger.info(`[Instance2] Iniciando sessão ${sessionName} (whatsappId=${whatsapp.id})`);

  await whatsapp.update({ status: "OPENING" });
  io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
    action: "update",
    session: whatsapp,
  });

  // Registra na instance2 (cria ou garante existência da sessão)
  await instance2StartSession(sessionName, whatsapp.token || "", whatsapp.name || "");

  // Cria o proxy socket e o registra para uso por webhook e SendMessage
  const proxy = buildProxySocket(whatsapp);
  registerInstance2Emitter(whatsapp.id, proxy);

  // Atribui wbotMessageListener ao proxy — ele vai ouvir "messages.upsert" emitidos
  // pelo webhook controller quando mensagens chegarem da instance2
  await wbotMessageListener(proxy, companyId);

  // Inicia polling de status/QR para atualizar o UaiViu
  pollInstance2Status(whatsapp, companyId, proxy);
};

const pollInstance2Status = async (
  whatsapp: Whatsapp,
  companyId: number,
  proxy: any
): Promise<void> => {
  const io = getIO();
  const sessionName = sessionNameFromId(whatsapp.id);
  let qrRetries = 0;
  let lastStatus = "";

  const poll = async () => {
    try {
      // Busca status atual
      const status = await instance2GetStatus(sessionName);

      if (status !== lastStatus) {
        lastStatus = status;
        logger.info(`[Instance2] Sessão ${sessionName} status: ${status}`);
      }

      if (status === "CONNECTED") {
        qrRetries = 0;
        if (whatsapp.status !== "CONNECTED") {
          await whatsapp.update({ status: "CONNECTED", qrcode: "" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), status: "CONNECTED", qrcode: "" },
          });
          logger.info(`[Instance2] Sessão ${sessionName} CONECTADA`);
        }
        // Continua polling para detectar desconexão futura
        setTimeout(poll, 15000);
        return;
      }

      if (status === "DISCONNECTED" || status === "TIMEOUT") {
        if (whatsapp.status === "CONNECTED") {
          await whatsapp.update({ status: "DISCONNECTED" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), status: "DISCONNECTED" },
          });
          logger.warn(`[Instance2] Sessão ${sessionName} desconectou`);
        }
        // Para polling — aguarda reconexão manual
        removeInstance2Emitter(whatsapp.id);
        return;
      }

      // Status = CONNECTING ou aguardando QR
      if (status === "QRCODE" || status === "CONNECTING") {
        const qr = await instance2GetQR(sessionName);
        if (qr && qr !== whatsapp.qrcode) {
          qrRetries++;
          await whatsapp.update({ qrcode: qr, status: "qrcode" });
          io.to(`company-${companyId}-mainchannel`).emit("whatsappSession", {
            action: "update",
            session: { ...whatsapp.get({ plain: true }), qrcode: qr, status: "qrcode" },
          });
          logger.info(`[Instance2] QR code atualizado para ${sessionName} (tentativa ${qrRetries})`);
        }

        if (qrRetries >= MAX_QR_RETRIES) {
          logger.warn(`[Instance2] QR expirado para ${sessionName} após ${qrRetries} tentativas`);
          await whatsapp.update({ status: "DISCONNECTED", qrcode: "" });
          removeInstance2Emitter(whatsapp.id);
          return;
        }
      }

      setTimeout(poll, POLL_INTERVAL_MS);
    } catch (err: any) {
      logger.error(`[Instance2] Erro no polling de ${sessionName}: ${err?.message}`);
      setTimeout(poll, POLL_INTERVAL_MS * 3);
    }
  };

  // Inicia o polling após um breve delay para a instance2 processar o start
  setTimeout(poll, 2000);
};
