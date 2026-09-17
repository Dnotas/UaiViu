import axios from "axios";
import { logger } from "../utils/logger";

// Ponte temporária: quando uma conexão WhatsApp está com provider="wapi_bridge",
// o envio é feito direto via W-API (serviço externo, api.w-api.app) em vez do
// Baileys local — usado enquanto o pareamento novo do Baileys estiver quebrado
// (bug de protocolo do WhatsApp, set/2026).
//
// Cada conexão pode ter sua própria instância W-API (Whatsapp.wapiInstanceId/
// wapiInstanceToken) — usado pra ter mais de um cliente na ponte ao mesmo tempo
// (ex.: "Suporte" e "Suporte01"/Daniel, cada um com número e instância próprios
// na W-API). Quando a conexão não tem essas colunas preenchidas, cai pras env
// vars globais WAPI_INSTANCE_ID/WAPI_TOKEN — é o caso da conexão "Suporte"
// original, que continua funcionando sem precisar de nenhum dado extra no banco.
const WAPI_INSTANCE_ID = process.env.WAPI_INSTANCE_ID || "";
const WAPI_TOKEN = process.env.WAPI_TOKEN || "";

export type WapiInstanceLike = {
  wapiInstanceId?: string | null;
  wapiInstanceToken?: string | null;
};

export type WapiCredentials = { instanceId: string; token: string };

export const getWapiCredentials = (whatsapp?: WapiInstanceLike): WapiCredentials => ({
  instanceId: whatsapp?.wapiInstanceId || WAPI_INSTANCE_ID,
  token: whatsapp?.wapiInstanceToken || WAPI_TOKEN
});

export const isWapiBridgeConfigured = (whatsapp?: WapiInstanceLike): boolean => {
  const { instanceId, token } = getWapiCredentials(whatsapp);
  return !!instanceId && !!token;
};

const wapi = axios.create({
  baseURL: "https://api.w-api.app/v1",
  headers: { "Content-Type": "application/json" }
});

export const wapiBridgeSendText = async (
  phone: string,
  message: string,
  whatsapp?: WapiInstanceLike
): Promise<{ messageId?: string }> => {
  const { instanceId, token } = getWapiCredentials(whatsapp);
  const { data } = await wapi.post(
    `/message/send-text?instanceId=${instanceId}`,
    { phone, message },
    { timeout: 30000, headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

export const wapiBridgeSendImage = async (
  phone: string,
  image: string,
  caption?: string,
  whatsapp?: WapiInstanceLike
): Promise<{ messageId?: string }> => {
  const { instanceId, token } = getWapiCredentials(whatsapp);
  const { data } = await wapi.post(
    `/message/send-image?instanceId=${instanceId}`,
    { phone, image, ...(caption ? { caption } : {}) },
    { timeout: 60000, headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

export const wapiBridgeSendDocument = async (
  phone: string,
  document: string,
  extension: string,
  fileName?: string,
  caption?: string,
  whatsapp?: WapiInstanceLike
): Promise<{ messageId?: string }> => {
  const { instanceId, token } = getWapiCredentials(whatsapp);
  // Log temporário pra diagnosticar um caso em que o W-API responde 200 mas o
  // documento não chega no WhatsApp de verdade — sem isso não dá pra saber se o
  // problema é o formato do base64/extension ou algo do lado do W-API.
  logger.info(
    `[wapiBridgeSendDocument] instanceId=${instanceId} phone=${phone} extension=${extension} fileName=${fileName} documentLength=${document?.length} documentPrefix=${document?.slice(0, 40)}`
  );
  const { data } = await wapi.post(
    `/message/send-document?instanceId=${instanceId}`,
    {
      phone,
      document,
      extension,
      ...(fileName ? { fileName } : {}),
      ...(caption ? { caption } : {})
    },
    { timeout: 60000, headers: { Authorization: `Bearer ${token}` } }
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
  mimetype: string,
  whatsapp?: WapiInstanceLike
): Promise<{ fileLink?: string }> => {
  const { instanceId, token } = getWapiCredentials(whatsapp);
  const { data } = await wapi.post(
    `/message/download-media?instanceId=${instanceId}`,
    { mediaKey, directPath, type, mimetype },
    { timeout: 30000, headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};
