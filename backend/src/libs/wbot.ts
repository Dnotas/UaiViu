import * as Sentry from "@sentry/node";
import makeWASocket, {
  WASocket,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  // makeInMemoryStore,
  isJidBroadcast,
  CacheStore,
  BufferJSON
} from "baileys";
import makeWALegacySocket from "baileys";
import P from "pino";

import Whatsapp from "../models/Whatsapp";
import Message from "../models/Message";
import { logger } from "../utils/logger";
import MAIN_LOGGER from "baileys/lib/Utils/logger";
import authState from "../helpers/authState";
import { Boom } from "@hapi/boom";
import AppError from "../errors/AppError";
import { getIO } from "./socket";
import { Store } from "./store";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import NodeCache from 'node-cache';

const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "error";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const sessions: Session[] = [];

const retriesQrCodeMap = new Map<number, number>();

// Rastreamento para auto-restart por falhas de decriptografia
const lastAutoRestartAtMap = new Map<number, number>();
const manualRestartsSet = new Set<number>();

const scheduleAutoRestart = (whatsapp: Whatsapp) => {
  const now = Date.now();
  if (now - (lastAutoRestartAtMap.get(whatsapp.id) || 0) < 5 * 60_000) return;
  lastAutoRestartAtMap.set(whatsapp.id, now);
  logger.info(`[WBot] ⚡ Auto-restart: falha de decriptografia — reiniciando sessão ${whatsapp.id}`);
  setTimeout(() => {
    clearAndRestartSession(whatsapp).catch(err =>
      logger.error(`[WBot] Erro no auto-restart: ${err}`));
  }, 500);
};

export const clearAndRestartSession = async (whatsapp: Whatsapp): Promise<void> => {
  if (manualRestartsSet.has(whatsapp.id)) {
    logger.info(`[WBot] Sessão ${whatsapp.id} já em restart, ignorando chamada duplicada`);
    return;
  }
  manualRestartsSet.add(whatsapp.id);

  // Fecha wbot atual sem logout
  const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
  if (sessionIndex !== -1) {
    try { (sessions[sessionIndex] as any).ws?.close?.(); } catch {}
    sessions.splice(sessionIndex, 1);
  }

  // Limpa keys (Signal Protocol) mas mantém creds — reconecta sem QR
  if (whatsapp.session) {
    try {
      const parsed = JSON.parse(whatsapp.session, BufferJSON.reviver);
      await whatsapp.update({
        session: JSON.stringify({ creds: parsed.creds, keys: {} }, BufferJSON.replacer, 0)
      });
    } catch {
      await whatsapp.update({ session: "" });
    }
  }

  logger.info(`[WBot] Sessão ${whatsapp.id} reiniciada sem QR code`);
  await StartWhatsAppSession(whatsapp, whatsapp.companyId);
};

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex(s => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }
  return sessions[sessionIndex];
};

export const removeWbot = async (
  whatsappId: number,
  isLogout = true
): Promise<void> => {
  try {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex !== -1) {
      if (isLogout) {
        sessions[sessionIndex].logout();
        sessions[sessionIndex].ws.close();
      }

      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    logger.error(err);
  }
};

export const initWASocket = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise(async (resolve, reject) => {
    try {
      (async () => {
        const io = getIO();

        const whatsappUpdate = await Whatsapp.findOne({
          where: { id: whatsapp.id }
        });

        if (!whatsappUpdate) return;

        const { id, name, provider } = whatsappUpdate;

        const { version, isLatest } = await fetchLatestBaileysVersion();
        const isLegacy = provider === "stable" ? true : false;

        logger.info(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
        logger.info(`isLegacy: ${isLegacy}`);
        logger.info(`Starting session ${name}`);
        let retriesQrCode = 0;

        let wsocket: Session = null;
        // const store = makeInMemoryStore({
        //   logger: loggerBaileys
        // });

        const { state, saveState } = await authState(whatsapp);

        const msgRetryCounterCache = new NodeCache();
        const userDevicesCache: CacheStore = new NodeCache();

        // Logger por sessão — intercepta falhas de decriptografia para auto-restart
        const perSessionLogger = {
          level: loggerBaileys.level,
          trace: (...args: any[]) => (loggerBaileys as any).trace(...args),
          debug: (...args: any[]) => (loggerBaileys as any).debug(...args),
          info: (...args: any[]) => (loggerBaileys as any).info(...args),
          warn: (...args: any[]) => (loggerBaileys as any).warn(...args),
          fatal: (...args: any[]) => (loggerBaileys as any).fatal(...args),
          child() { return this; },
          error(obj: any, msg?: string) {
            const message = msg || obj?.msg || (typeof obj === "string" ? obj : "");
            if (message === "failed to decrypt message") {
              scheduleAutoRestart(whatsapp);
            }
            (loggerBaileys as any).error(obj, msg);
          },
        } as any;

        wsocket = makeWASocket({
          logger: perSessionLogger,
          printQRInTerminal: false,
          browser: Browsers.appropriate("Desktop"),
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
          },
          version,
          // defaultQueryTimeoutMs: 60000,
          // retryRequestDelayMs: 250,
          // keepAliveIntervalMs: 1000 * 60 * 10 * 3,
          msgRetryCounterCache,
          userDevicesCache,
          shouldIgnoreJid: jid => isJidBroadcast(jid),
          getMessage: async (key) => {
            try {
              const messageInDB = await Message.findOne({
                where: { id: key.id },
                attributes: ["dataJson"]
              });
              if (messageInDB?.dataJson) {
                const msgData = JSON.parse(messageInDB.dataJson);
                return msgData.message || undefined;
              }
            } catch (err) {
              logger.error(`[getMessage] Erro ao buscar mensagem para retry - ID: ${key.id} - Err: ${err}`);
            }
            return undefined;
          }
        });

        // wsocket = makeWASocket({
        //   version,
        //   logger: loggerBaileys,
        //   printQRInTerminal: false,
        //   auth: state as AuthenticationState,
        //   generateHighQualityLinkPreview: false,
        //   shouldIgnoreJid: jid => isJidBroadcast(jid),
        //   browser: ["Chat", "Chrome", "10.15.7"],
        //   patchMessageBeforeSending: (message) => {
        //     const requiresPatch = !!(
        //       message.buttonsMessage ||
        //       // || message.templateMessage
        //       message.listMessage
        //     );
        //     if (requiresPatch) {
        //       message = {
        //         viewOnceMessage: {
        //           message: {
        //             messageContextInfo: {
        //               deviceListMetadataVersion: 2,
        //               deviceListMetadata: {},
        //             },
        //             ...message,
        //           },
        //         },
        //       };
        //     }

        //     return message;
        //   },
        // })

        wsocket.ev.on(
          "connection.update",
          async ({ connection, lastDisconnect, qr }) => {
            logger.info(
              `Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect || ""
              }`
            );

            if (connection === "close") {
              if ((lastDisconnect?.error as Boom)?.output?.statusCode === 403) {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
                removeWbot(id, false);
              }
              if (
                (lastDisconnect?.error as Boom)?.output?.statusCode !==
                DisconnectReason.loggedOut
              ) {
                removeWbot(id, false);
                if (!manualRestartsSet.has(id)) {
                  setTimeout(
                    () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                    2000
                  );
                }
                // NÃO deletar aqui — deixa o handler do "open" remover após conexão estável
              } else {
                await whatsapp.update({ status: "PENDING", session: "" });
                await DeleteBaileysService(whatsapp.id);
                io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
                removeWbot(id, false);
                if (!manualRestartsSet.has(id)) {
                  setTimeout(
                    () => StartWhatsAppSession(whatsapp, whatsapp.companyId),
                    2000
                  );
                }
                // NÃO deletar aqui — deixa o handler do "open" remover após conexão estável
              }
            }

            if (connection === "open") {
              await whatsapp.update({
                status: "CONNECTED",
                qrcode: "",
                retries: 0
              });

              io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
                action: "update",
                session: whatsapp
              });

              const sessionIndex = sessions.findIndex(
                s => s.id === whatsapp.id
              );
              if (sessionIndex === -1) {
                wsocket.id = whatsapp.id;
                sessions.push(wsocket);
              }

              // Conexão estabilizou — libera proteção contra restart duplicado
              manualRestartsSet.delete(whatsapp.id);

              resolve(wsocket);
            }

            if (qr !== undefined) {
              if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                await whatsappUpdate.update({
                  status: "DISCONNECTED",
                  qrcode: ""
                });
                await DeleteBaileysService(whatsappUpdate.id);
                io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
                  action: "update",
                  session: whatsappUpdate
                });
                wsocket.ev.removeAllListeners("connection.update");
                wsocket.ws.close();
                wsocket = null;
                retriesQrCodeMap.delete(id);
              } else {
                logger.info(`Session QRCode Generate ${name}`);
                retriesQrCodeMap.set(id, (retriesQrCode += 1));

                await whatsapp.update({
                  qrcode: qr,
                  status: "qrcode",
                  retries: 0
                });
                const sessionIndex = sessions.findIndex(
                  s => s.id === whatsapp.id
                );

                if (sessionIndex === -1) {
                  wsocket.id = whatsapp.id;
                  sessions.push(wsocket);
                }

                io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
                  action: "update",
                  session: whatsapp
                });
              }
            }
          }
        );
        wsocket.ev.on("creds.update", saveState);

        //store.bind(wsocket.ev);
      })();
    } catch (error) {
      Sentry.captureException(error);
      console.log(error);
      reject(error);
    }
  });
};
