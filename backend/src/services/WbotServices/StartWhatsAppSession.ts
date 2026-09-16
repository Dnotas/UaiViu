import { initWASocket } from "../../libs/wbot";
import Whatsapp from "../../models/Whatsapp";
import { wbotMessageListener } from "./wbotMessageListener";
import { getIO } from "../../libs/socket";
import wbotMonitor from "./wbotMonitor";
import { logger } from "../../utils/logger";
import * as Sentry from "@sentry/node";

// Evita iniciar a mesma sessão duas vezes em paralelo (ex: clique manual +
// retry automático quase simultâneos), o que gera sockets concorrentes e
// closeCode=440 (connectionReplaced) no WhatsApp.
const startingSessions = new Set<number>();

export const StartWhatsAppSession = async (
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> => {
  // Conexões marcadas como ponte via W-API não usam Baileys — o envio é
  // feito via helpers/wapiBridgeClient.ts, então não há sessão pra abrir.
  if (whatsapp.provider === "wapi_bridge") {
    await whatsapp.update({ status: "CONNECTED" });
    const io = getIO();
    io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
      action: "update",
      session: whatsapp
    });
    return;
  }

  if (startingSessions.has(whatsapp.id)) {
    logger.info(`[WBot] Sessão ${whatsapp.id} já está iniciando, ignorando chamada concorrente`);
    return;
  }
  startingSessions.add(whatsapp.id);

  await whatsapp.update({ status: "OPENING" });

  const io = getIO();
  io.to(`company-${whatsapp.companyId}-mainchannel`).emit("whatsappSession", {
    action: "update",
    session: whatsapp
  });

  try {
    const wbot = await initWASocket(whatsapp);
    wbotMessageListener(wbot, companyId);
    wbotMonitor(wbot, whatsapp, companyId);
  } catch (err) {
    Sentry.captureException(err);
    logger.error(err);
  } finally {
    startingSessions.delete(whatsapp.id);
  }
};
