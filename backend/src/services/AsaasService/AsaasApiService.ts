import axios from "axios";

const getBaseUrl = (environment: string): string => {
  return environment === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
};

const buildHeaders = (token: string) => ({
  "access_token": token,
  "Content-Type": "application/json",
});

export const findCustomerByCpfCnpj = async (
  token: string,
  environment: string,
  cpfCnpj: string
): Promise<any[]> => {
  const clean = cpfCnpj.replace(/\D/g, "");
  const baseUrl = getBaseUrl(environment);
  const { data } = await axios.get(`${baseUrl}/customers`, {
    headers: buildHeaders(token),
    params: { cpfCnpj: clean, limit: 10 },
  });
  return data?.data || [];
};

export const getPaymentsByCustomer = async (
  token: string,
  environment: string,
  customerId: string,
  filters: { status?: string; month?: string }
): Promise<any[]> => {
  const baseUrl = getBaseUrl(environment);
  const params: any = { customer: customerId, limit: 100 };

  if (filters.status && filters.status !== "ALL") {
    params.status = filters.status;
  }

  if (filters.month) {
    const parts = filters.month.split("-");
    if (parts.length === 2 && parts[0] && parts[1]) {
      const [year, month] = parts;
      const pad = (n: string) => n.padStart(2, "0");
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      params["dueDate[ge]"] = `${year}-${pad(month)}-01`;
      params["dueDate[le]"] = `${year}-${pad(month)}-${daysInMonth}`;
    }
  }

  const { data } = await axios.get(`${baseUrl}/payments`, {
    headers: buildHeaders(token),
    params,
  });
  return data?.data || [];
};

export const formatStatus = (status: string): string => {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    RECEIVED: "Recebido",
    CONFIRMED: "Confirmado",
    OVERDUE: "Vencido",
    REFUNDED: "Reembolsado",
    REFUND_REQUESTED: "Reembolso Solicitado",
    CHARGEBACK_REQUESTED: "Contestação",
    RECEIVED_IN_CASH: "Recebido em Dinheiro",
    AWAITING_RISK_ANALYSIS: "Em Análise",
  };
  return map[status] || status;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
};

export const buildBoletoMessage = (payment: any): string => {
  const value = formatCurrency(payment.value);
  const dueDate = formatDate(payment.dueDate);
  const link = payment.invoiceUrl || payment.bankSlipUrl || "";

  let msg = `Olá! 👋\n\n`;
  msg += `Segue sua cobrança com vencimento em *${dueDate}* no valor de *${value}*.`;
  if (link) {
    msg += `\n\n🔗 ${link}`;
  }
  msg += `\n\nQualquer dúvida, estamos à disposição. 😊`;
  return msg;
};

export const getPaymentById = async (
  token: string,
  environment: string,
  paymentId: string
): Promise<any | null> => {
  const baseUrl = getBaseUrl(environment);
  const { data } = await axios.get(`${baseUrl}/payments/${paymentId}`, {
    headers: buildHeaders(token),
  });
  return data || null;
};

export const getCustomerById = async (
  token: string,
  environment: string,
  customerId: string
): Promise<any | null> => {
  const baseUrl = getBaseUrl(environment);
  const { data } = await axios.get(`${baseUrl}/customers/${customerId}`, {
    headers: buildHeaders(token),
  });
  return data || null;
};

export const buildBoletoPdfName = (customerName: string, dueDate: string): string => {
  const [y, m, d] = (dueDate || "").split("-");
  const dateStr = d && m && y ? `${d}-${m}-${y}` : dueDate || "sem-data";
  const safeName = (customerName || "CLIENTE").toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  return `BOLETO ${safeName} ${dateStr}.pdf`;
};

export const extractLinhaDigitavelFromPdf = async (pdfBuffer: Buffer): Promise<string | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParseModule = require("pdf-parse");
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(pdfBuffer);
    const text: string = data.text || "";
    console.log("[PDF-PARSE] Texto extraído do boleto:", JSON.stringify(text.slice(0, 500)));

    // Padrão 1 (com pontos): 46191.11000 00000.000042 15221.865015 2 13910000039700
    const p1 = text.match(/\d{5}\.\d{5}\s+\d{5}\.\d{6}\s+\d{5}\.\d{6}\s+\d\s+\d{14}/);
    if (p1) return p1[0].replace(/\s+/g, " ").trim();

    // Padrão 2 (sem pontos, com espaços): 4619111000 0000000004215221865015 2 13910000039700
    const p2 = text.match(/\d{10}\s+\d{11}\s*\d{11}\s+\d\s+\d{14}/);
    if (p2) return p2[0].replace(/\s+/g, " ").trim();

    // Padrão 3 (após label "Linha digitável")
    const p3 = text.match(/[Ll]inha\s+[Dd]igit[aá]vel[\s\S]{0,10}?(\d[\d\s\.]{44,60}\d)/);
    if (p3) {
      const candidate = p3[1].replace(/\s+/g, " ").trim();
      if (candidate.replace(/[\s\.]/g, "").length >= 47) return candidate;
    }

    // Padrão 4 (47 dígitos corridos no texto sem espaços)
    const stripped = text.replace(/[^\d]/g, "");
    const p4 = stripped.match(/\d{47}/);
    if (p4) {
      // Formata: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX
      const d = p4[0];
      return `${d.slice(0,5)}.${d.slice(5,10)} ${d.slice(10,15)}.${d.slice(15,21)} ${d.slice(21,26)}.${d.slice(26,32)} ${d[32]} ${d.slice(33)}`;
    }

    return null;
  } catch (err: any) {
    console.log("[PDF-PARSE] ERRO na extração:", err?.message || err);
    return null;
  }
};

export const downloadBoletoPdf = async (bankSlipUrl: string): Promise<Buffer | null> => {
  if (!bankSlipUrl) return null;
  try {
    const response = await axios.get(bankSlipUrl, {
      responseType: "arraybuffer",
      headers: { Accept: "application/pdf,*/*" },
      maxRedirects: 5,
      timeout: 15000,
    });
    const contentType: string = response.headers["content-type"] || "";
    if (contentType.includes("pdf")) {
      return Buffer.from(response.data);
    }
    return null;
  } catch {
    return null;
  }
};
