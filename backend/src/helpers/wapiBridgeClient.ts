import axios from "axios";
import { logger } from "../utils/logger";

// Ponte temporária: quando uma conexão WhatsApp está com provider="wapi_bridge",
// o envio é feito direto via W-API (serviço externo, api.w-api.app) em vez do
// Baileys local — usado enquanto o pareamento novo do Baileys estiver quebrado
// (bug de protocolo do WhatsApp, set/2026).
const WAPI_INSTANCE_ID = process.env.WAPI_INSTANCE_ID || "";
const WAPI_TOKEN = process.env.WAPI_TOKEN || "";

const wapi = axios.create({
  baseURL: "https://api.w-api.app/v1",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${WAPI_TOKEN}`
  }
});

export const isWapiBridgeConfigured = (): boolean =>
  !!WAPI_INSTANCE_ID && !!WAPI_TOKEN;

export const wapiBridgeSendText = async (
  phone: string,
  message: string
): Promise<{ messageId?: string }> => {
  const { data } = await wapi.post(
    `/message/send-text?instanceId=${WAPI_INSTANCE_ID}`,
    { phone, message },
    { timeout: 30000 }
  );
  return data;
};

export const wapiBridgeSendImage = async (
  phone: string,
  image: string,
  caption?: string
): Promise<{ messageId?: string }> => {
  const { data } = await wapi.post(
    `/message/send-image?instanceId=${WAPI_INSTANCE_ID}`,
    { phone, image, ...(caption ? { caption } : {}) },
    { timeout: 60000 }
  );
  return data;
};

export const wapiBridgeSendDocument = async (
  phone: string,
  document: string,
  extension: string,
  fileName?: string,
  caption?: string
): Promise<{ messageId?: string }> => {
  // Log temporário pra diagnosticar um caso em que o W-API responde 200 mas o
  // documento não chega no WhatsApp de verdade — sem isso não dá pra saber se o
  // problema é o formato do base64/extension ou algo do lado do W-API.
  logger.info(
    `[wapiBridgeSendDocument] phone=${phone} extension=${extension} fileName=${fileName} documentLength=${document?.length} documentPrefix=${document?.slice(0, 40)}`
  );
  const { data } = await wapi.post(
    `/message/send-document?instanceId=${WAPI_INSTANCE_ID}`,
    {
      phone,
      document,
      extension,
      ...(fileName ? { fileName } : {}),
      ...(caption ? { caption } : {})
    },
    { timeout: 60000 }
  );
  logger.info(`[wapiBridgeSendDocument] resposta W-API: ${JSON.stringify(data)}`);
  return data;
};

// Mensagens recebidas chegam do W-API só com a referência criptografada da mídia
// (mediaKey/directPath, igual o protocolo do WhatsApp) — precisa desse endpoint pra
// pegar um link http temporário de onde baixar o arquivo de verdade.
export const wapiBridgeDownloadMedia = async (
  mediaKey: string,
  directPath: string,
  type: string,
  mimetype: string
): Promise<{ fileLink?: string }> => {
  const { data } = await wapi.post(
    `/message/download-media?instanceId=${WAPI_INSTANCE_ID}`,
    { mediaKey, directPath, type, mimetype },
    { timeout: 30000 }
  );
  return data;
};
