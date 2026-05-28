import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
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

const SESSION_DIR = path.resolve(process.cwd(), "sessions");

const getSessionPath = (whatsappId: number) =>
  path.resolve(SESSION_DIR, `food_${whatsappId}`);

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

  const wbot = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["UaiViu Food", "Chrome", "1.0.0"],
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

      if (shouldReconnect) {
        setTimeout(() => initWbotSession(whatsapp), 5000);
      }
    }

    if (connection === "open") {
      const phone = wbot.user?.id?.split(":")[0] || "";
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
      if (!msg.key.fromMe && msg.key.remoteJid) {
        await handleFoodMessage(msg, wbot, whatsapp);
      }
    }
  });

  sessions.set(whatsapp.id, wbot);
};

export const initWbotFood = async () => {
  const whatsapps = await FoodWhatsapp.findAll();
  for (const w of whatsapps) {
    await initWbotSession(w);
  }
};
