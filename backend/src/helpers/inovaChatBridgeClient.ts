import axios from "axios";

// Ponte pra clientes conectados na InovaChat (outra plataforma de WhatsApp,
// mesma familia do UaiViu) em vez de W-API. Cada conexão InovaChat tem seu
// proprio token (guardado em Whatsapp.token) — diferente do W-API, que usa
// uma unica instancia global (WAPI_INSTANCE_ID/WAPI_TOKEN).
const INOVACHAT_BASE_URL = process.env.INOVACHAT_BASE_URL || "https://api25.inovachat.com.br";

const inovaChatHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json"
});

export const inovaChatSendText = async (
  token: string,
  phone: string,
  body: string
): Promise<any> => {
  const { data } = await axios.post(
    `${INOVACHAT_BASE_URL}/api/messages/send`,
    { number: phone, body, openTicket: "0" },
    { headers: inovaChatHeaders(token), timeout: 30000 }
  );
  return data;
};

// A conexao desse cliente e tier "Pro" (whatsmeow_pro) — os endpoints
// "Basica" de imagem/documento (sendURLImage/sendURLDocument) nao funcionam
// pra conexao Pro (erro generico de null/undefined do lado deles). O
// endpoint Pro certo e unificado por "type", e exige openTicket/queueId
// presentes no body mesmo sem querer abrir ticket (testado ao vivo).
export const inovaChatSendImageByUrl = async (
  token: string,
  phone: string,
  imageUrl: string,
  fileName: string,
  caption?: string
): Promise<any> => {
  const { data } = await axios.post(
    `${INOVACHAT_BASE_URL}/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO`,
    {
      number: phone,
      type: "image",
      body: imageUrl,
      fileName,
      openTicket: "0",
      queueId: "0",
      ...(caption ? { caption } : {})
    },
    { headers: inovaChatHeaders(token), timeout: 30000 }
  );
  return data;
};

export const inovaChatSendDocumentByUrl = async (
  token: string,
  phone: string,
  documentUrl: string,
  fileName: string,
  caption?: string
): Promise<any> => {
  const { data } = await axios.post(
    `${INOVACHAT_BASE_URL}/api/messages/whatsmeow/sendUrlFilesWhatsmeowPRO`,
    {
      number: phone,
      type: "document",
      body: documentUrl,
      fileName,
      openTicket: "0",
      queueId: "0",
      ...(caption ? { caption } : {})
    },
    { headers: inovaChatHeaders(token), timeout: 30000 }
  );
  return data;
};
