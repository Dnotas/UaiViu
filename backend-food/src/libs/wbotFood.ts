import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import FoodWhatsapp from "../models/FoodWhatsapp";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import { getIO } from "./socket";
import { handleFoodMessage } from "../services/wbot/FoodMessageHandler";

const sessions: Map<number, ReturnType<typeof makeWASocket>> = new Map();

// Mapa @lid JID → JID real (@s.whatsapp.net) por sessão
const lidMaps: Map<number, Map<string, string>> = new Map();

export const getLidMap = (whatsappId: number): Map<string, string> =>
  lidMaps.get(whatsappId) || new Map();

const SESSION_DIR = path.resolve(process.cwd(), "sessions");

const getSessionPath = (whatsappId: number) =>
  path.resolve(SESSION_DIR, `food_${whatsappId}`);

// IDs aguardando restart manual — suprime auto-reconexão na próxima vez que fechar
const manualRestarts = new Set<number>();

/** Limpa arquivos de sessão corrompidos mantendo apenas creds.json (sem QR necessário) */
export const clearAndRestart = async (whatsapp: FoodWhatsapp): Promise<void> => {
  manualRestarts.add(whatsapp.id);

  // Fecha wbot atual sem logout
  const existing = sessions.get(whatsapp.id);
  sessions.delete(whatsapp.id);
  if (existing) {
    try { (existing as any).ws?.close?.(); } catch {}
    try { (existing as any).end?.(new Error("manual_restart")); } catch {}
  }

  // Apaga arquivos de sessão corrompidos, mantém creds.json
  const sessionPath = getSessionPath(whatsapp.id);
  if (fs.existsSync(sessionPath)) {
    for (const file of fs.readdirSync(sessionPath)) {
      if (file !== "creds.json") {
        try { fs.unlinkSync(path.join(sessionPath, file)); } catch {}
      }
    }
  }
  console.log(`[WBot] Sessão reiniciada para whatsapp ${whatsapp.id}`);

  // Inicia nova sessão com credenciais existentes
  await initWbotSession(whatsapp);
};

// Rastreamento para auto-restart por falhas de decriptografia
const decryptFailTimes: Map<number, number[]> = new Map();
const lastAutoRestartAt: Map<number, number> = new Map();

export const getWbot = (whatsappId: number) => {
  const wbot = sessions.get(whatsappId);
  if (!wbot) throw new Error(`Sessão WhatsApp ${whatsappId} não encontrada`);
  return wbot;
};

export const initWbotSession = async (whatsapp: FoodWhatsapp) => {
  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  const sessionPath = getSessionPath(whatsapp.id);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  // Logger silencioso que detecta falhas de decriptografia para auto-restart
  const baileysLogger = {
    level: "silent",
    trace: () => {}, debug: () => {}, info: () => {}, warn: () => {},
    fatal: () => {}, silent: () => {},
    child() { return this; },
    error(obj: any, msg?: string) {
      const message = msg || obj?.msg || (typeof obj === "string" ? obj : "");
      if (message === "failed to decrypt message") {
        scheduleAutoRestart(whatsapp);
      }
    },
  } as any;

  const wbot = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["UaiViu Food", "Chrome", "1.0.0"],
    logger: baileysLogger,
  });

  // Mapeia @lid JIDs para JIDs reais (@s.whatsapp.net) via evento de contatos
  const lidMap = new Map<string, string>();
  lidMaps.set(whatsapp.id, lidMap);
  wbot.ev.on("contacts.upsert", (contacts) => {
    for (const contact of contacts) {
      const lid = (contact as any).lid as string | undefined;
      if (lid && contact.id && !contact.id.endsWith("@lid")) {
        lidMap.set(lid, contact.id);
      }
    }
  });

  wbot.ev.on("creds.update", saveCreds);

  wbot.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const io = getIO();

    if (qr) {
      await whatsapp.update({ status: "QRCODE", qrcode: qr });
      io.to(`food-company-${whatsapp.companyId}`).emit("food-whatsapp-update", {
        action: "update",
        whatsapp: { id: whatsapp.id, status: "QRCODE", qrcode: qr }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      await whatsapp.update({ status: "DISCONNECTED", qrcode: null });
      io.to(`food-company-${whatsapp.companyId}`).emit("food-whatsapp-update", {
        action: "update",
        whatsapp: { id: whatsapp.id, status: "DISCONNECTED" }
      });

      sessions.delete(whatsapp.id);

      if (shouldReconnect && !manualRestarts.has(whatsapp.id)) {
        setTimeout(() => initWbotSession(whatsapp), 5000);
      }
      manualRestarts.delete(whatsapp.id);
    }

    if (connection === "open") {
      const phone = wbot.user?.id?.split(":")[0] || "";
      sessions.set(whatsapp.id, wbot);
      await whatsapp.update({ status: "CONNECTED", qrcode: null, phone });
      io.to(`food-company-${whatsapp.companyId}`).emit("food-whatsapp-update", {
        action: "update",
        whatsapp: { id: whatsapp.id, status: "CONNECTED", phone }
      });
    }
  });

  wbot.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe === false && msg.key.remoteJid) {
        await handleFoodMessage(msg, wbot, whatsapp, lidMap);
      }
    }
  });
};

// Agenda auto-restart após 3 falhas de decriptografia em 60s (cooldown de 5 min)
const scheduleAutoRestart = (whatsapp: FoodWhatsapp) => {
  const now = Date.now();
  if (now - (lastAutoRestartAt.get(whatsapp.id) || 0) < 5 * 60_000) return;

  const recent = (decryptFailTimes.get(whatsapp.id) || []).filter(t => now - t < 60_000);
  recent.push(now);
  decryptFailTimes.set(whatsapp.id, recent);

  if (recent.length >= 1) {
    decryptFailTimes.set(whatsapp.id, []);
    lastAutoRestartAt.set(whatsapp.id, now);
    console.log(`[WBot] ⚡ Auto-restart: 3 falhas de decriptografia detectadas — reiniciando sessão ${whatsapp.id}`);
    setTimeout(() => {
      clearAndRestart(whatsapp).catch(err =>
        console.error("[WBot] Erro no auto-restart:", err));
    }, 500);
  }
};

export const initWbotFood = async () => {
  const whatsapps = await FoodWhatsapp.findAll();
  for (const w of whatsapps) {
    await initWbotSession(w);
  }
};
