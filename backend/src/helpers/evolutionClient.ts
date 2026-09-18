import axios from "axios";
import { logger } from "../utils/logger";

const getUrl = () => process.env.EVOLUTION_API_URL || "";
const getApiKey = () => process.env.EVOLUTION_API_KEY || "";

const headers = () => ({
  "Content-Type": "application/json",
  apikey: getApiKey(),
});

export const isEvolutionConfigured = (): boolean => !!getUrl();

export const instanceNameFromId = (whatsappId: number): string =>
  `whats_ev_${whatsappId}`;

export const whatsappIdFromInstanceName = (instanceName: string): number | null => {
  const match = instanceName.match(/^whats_ev_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
};

export const evolutionCreateInstance = async (
  instanceName: string,
  webhookUrl: string
): Promise<void> => {
  const url = getUrl();
  if (!url) return;
  try {
    await axios.post(
      `${url}/instance/create`,
      {
        instanceName,
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "CONNECTION_UPDATE",
            "QRCODE_UPDATED",
          ],
        },
      },
      { headers: headers(), timeout: 10000 }
    );
  } catch (err: any) {
    // 400/409 indica que a instância já existe — não é erro fatal
    if (err?.response?.status !== 400 && err?.response?.status !== 409) {
      logger.warn(`[Evolution] createInstance "${instanceName}": ${err?.message}`);
    }
  }
};

export const evolutionGetQR = async (
  instanceName: string
): Promise<string | null> => {
  const url = getUrl();
  if (!url) return null;
  try {
    const { data } = await axios.get(
      `${url}/instance/connect/${instanceName}`,
      { headers: headers(), timeout: 8000 }
    );
    return (data as any).base64 || null;
  } catch {
    return null;
  }
};

export const evolutionGetStatus = async (
  instanceName: string
): Promise<string> => {
  const url = getUrl();
  if (!url) return "close";
  try {
    const { data } = await axios.get(
      `${url}/instance/connectionState/${instanceName}`,
      { headers: headers(), timeout: 5000 }
    );
    return (data as any)?.instance?.state || "close";
  } catch {
    return "close";
  }
};

export const evolutionSendText = async (
  instanceName: string,
  to: string,
  text: string
): Promise<{ key: { id: string } }> => {
  const url = getUrl();
  if (!url) throw new Error("EVOLUTION_API_URL não configurado");

  const { data } = await axios.post(
    `${url}/message/sendText/${instanceName}`,
    { number: to, text },
    { headers: headers(), timeout: 30000 }
  );
  return data as any;
};

export const evolutionSendMedia = async (
  instanceName: string,
  to: string,
  base64: string,
  mimetype: string,
  caption: string,
  filename: string
): Promise<{ key: { id: string } }> => {
  const url = getUrl();
  if (!url) throw new Error("EVOLUTION_API_URL não configurado");

  const typeMap: Record<string, string> = {
    image: "image",
    video: "video",
    audio: "audio",
    application: "document",
    document: "document",
    text: "document",
  };
  const mediatype = typeMap[mimetype.split("/")[0]] || "document";

  const { data } = await axios.post(
    `${url}/message/sendMedia/${instanceName}`,
    { number: to, mediatype, mimetype, media: base64, caption, fileName: filename },
    { headers: headers(), timeout: 60000 }
  );
  return data as any;
};

export const evolutionDeleteInstance = async (
  instanceName: string
): Promise<void> => {
  const url = getUrl();
  if (!url) return;
  try {
    await axios.delete(`${url}/instance/delete/${instanceName}`, {
      headers: headers(),
      timeout: 8000,
    });
  } catch (err: any) {
    logger.warn(`[Evolution] deleteInstance "${instanceName}": ${err?.message}`);
  }
};
