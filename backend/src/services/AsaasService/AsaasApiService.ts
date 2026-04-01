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
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(pdfBuffer);
    const text: string = data.text || "";

    // Padrão 1 (formatado): 46191.11000 00000.000042 20518.746019 5 14220000039700
    const p1 = text.match(/\d{5}[\.\s]\d{5}[\s]+\d{5}[\.\s]\d{6}[\s]+\d{5}[\.\s]\d{6}[\s]+\d[\s]+\d{14}/);
    if (p1) return p1[0].replace(/\s+/g, " ").trim();

    // Padrão 2 (sem espaço entre grupos): 4619111000 0000000004202 0518746019 5 14220000039700
    const p2 = text.match(/\d{10}[\s]+\d{13}[\s]+\d{10}[\s]+\d[\s]+\d{14}/);
    if (p2) return p2[0].replace(/\s+/g, " ").trim();

    // Padrão 3 (linha digitável label no PDF)
    const p3 = text.match(/[Ll]inha\s+[Dd]igit[aá]vel[\s:]+([0-9][0-9\s\.]{40,60})/);
    if (p3) return p3[1].replace(/\s+/g, " ").trim();

    // Padrão 4 (47 dígitos seguidos — código de barras bruto)
    const p4 = text.replace(/\s/g, "").match(/\d{47}/);
    if (p4) return p4[0];

    return null;
  } catch {
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
