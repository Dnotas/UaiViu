import axios from "axios";
import { logger } from "../utils/logger";

const getUrl = () => process.env.INSTANCE2_URL || "";
const getSecret = () => process.env.INSTANCE2_SECRET || "";

const adminHeaders = () => ({
  "Content-Type": "application/json",
  "x-admin-key": getSecret(),
});

export const isInstance2Configured = (): boolean => !!getUrl();

export const instance2StartSession = async (
  sessionName: string,
  token: string,
  label: string
): Promise<void> => {
  const url = getUrl();
  if (!url) return;
  try {
    await axios.post(
      `${url}/api/sessions`,
      { name: sessionName, token, label },
      { headers: adminHeaders(), timeout: 10000 }
    );
  } catch (err: any) {
    logger.warn(`[Instance2] startSession "${sessionName}": ${err?.message}`);
  }
};

export const instance2GetQR = async (
  sessionName: string
): Promise<string | null> => {
  const url = getUrl();
  if (!url) return null;
  try {
    const { data } = await axios.get(
      `${url}/api/sessions/${sessionName}/qr`,
      { headers: adminHeaders(), timeout: 8000 }
    );
    return (data as any).qr || null;
  } catch {
    return null;
  }
};

export const instance2GetStatus = async (
  sessionName: string
): Promise<string> => {
  const url = getUrl();
  if (!url) return "DISCONNECTED";
  try {
    const { data } = await axios.get(
      `${url}/api/sessions/${sessionName}/status`,
      { headers: adminHeaders(), timeout: 5000 }
    );
    return (data as any).status || "DISCONNECTED";
  } catch {
    return "DISCONNECTED";
  }
};

export const instance2SendText = async (
  sessionName: string,
  to: string,
  message: string
): Promise<{ key: { id: string } }> => {
  const url = getUrl();
  if (!url) throw new Error("INSTANCE2_URL não configurado");

  const { data } = await axios.post(
    `${url}/api/messages/send-text`,
    { session: sessionName, to, message },
    { headers: adminHeaders(), timeout: 30000 }
  );
  return data as any;
};

export const instance2SendMedia = async (
  sessionName: string,
  to: string,
  base64: string,
  mimetype: string,
  caption: string,
  filename: string
): Promise<{ key: { id: string } }> => {
  const url = getUrl();
  if (!url) throw new Error("INSTANCE2_URL não configurado");

  const { data } = await axios.post(
    `${url}/api/messages/send-media`,
    { session: sessionName, to, base64, mimetype, caption, filename },
    { headers: adminHeaders(), timeout: 60000 }
  );
  return data as any;
};

export const instance2DeleteSession = async (
  sessionName: string
): Promise<void> => {
  const url = getUrl();
  if (!url) return;
  try {
    await axios.delete(`${url}/api/sessions/${sessionName}`, {
      headers: adminHeaders(),
      timeout: 8000,
    });
  } catch (err: any) {
    logger.warn(`[Instance2] deleteSession "${sessionName}": ${err?.message}`);
  }
};

export const sessionNameFromId = (whatsappId: number): string =>
  `whats_${whatsappId}`;
