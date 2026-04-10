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
      // Aceita MM-YYYY e YYYY-MM
      const [year, month] = parts[0].length === 4
        ? [parts[0], parts[1]]   // YYYY-MM
        : [parts[1], parts[0]];  // MM-YYYY
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

export const buildBoletoPdfName = (customerName: string, dueDate: string, cpfCnpj?: string): string => {
  const [y, m, d] = (dueDate || "").split("-");
  const dateStr = d && m && y ? `${d}-${m}-${y}` : dueDate || "sem-data";
  const safeName = (customerName || "CLIENTE").toUpperCase().replace(/[^A-Z0-9\s]/g, "").trim();
  const doc = cpfCnpj ? ` ${cpfCnpj.replace(/\D/g, "")}` : "";
  return `BOLETO ${safeName}${doc} ${dateStr}.pdf`;
};

export const getAllOverduePayments = async (
  token: string,
  environment: string,
  month?: string
): Promise<any[]> => {
  const baseUrl = getBaseUrl(environment);
  const params: any = { status: "OVERDUE", billingType: "BOLETO", limit: 100 };

  if (month) {
    const parts = month.split("-");
    if (parts.length === 2 && parts[0] && parts[1]) {
      const [year, mon] = parts[0].length === 4 ? [parts[0], parts[1]] : [parts[1], parts[0]];
      const pad = (n: string) => n.padStart(2, "0");
      const daysInMonth = new Date(parseInt(year), parseInt(mon), 0).getDate();
      params["dueDate[ge]"] = `${year}-${pad(mon)}-01`;
      params["dueDate[le]"] = `${year}-${pad(mon)}-${daysInMonth}`;
    }
  }

  const allPayments: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await axios.get(`${baseUrl}/payments`, {
      headers: buildHeaders(token),
      params: { ...params, offset },
    });
    const items: any[] = data?.data || [];
    allPayments.push(...items);
    hasMore = data?.hasMore === true;
    offset += items.length;
    if (items.length === 0) hasMore = false;
  }

  return allPayments;
};

export const getAllPaidPayments = async (
  token: string,
  environment: string,
  month?: string
): Promise<any[]> => {
  const baseUrl = getBaseUrl(environment);

  const buildParams = (status: string, extraParams: any = {}) => {
    const params: any = { status, billingType: "BOLETO", limit: 100, ...extraParams };
    if (month) {
      const parts = month.split("-");
      if (parts.length === 2 && parts[0] && parts[1]) {
        const [year, mon] = parts[0].length === 4 ? [parts[0], parts[1]] : [parts[1], parts[0]];
        const pad = (n: string) => n.padStart(2, "0");
        const daysInMonth = new Date(parseInt(year), parseInt(mon), 0).getDate();
        params["paymentDate[ge]"] = `${year}-${pad(mon)}-01`;
        params["paymentDate[le]"] = `${year}-${pad(mon)}-${daysInMonth}`;
      }
    }
    return params;
  };

  const fetchAll = async (status: string): Promise<any[]> => {
    const allPayments: any[] = [];
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await axios.get(`${baseUrl}/payments`, {
        headers: buildHeaders(token),
        params: { ...buildParams(status), offset },
      });
      const items: any[] = data?.data || [];
      allPayments.push(...items);
      hasMore = data?.hasMore === true;
      offset += items.length;
      if (items.length === 0) hasMore = false;
    }
    return allPayments;
  };

  const [received, confirmed, receivedInCash] = await Promise.all([
    fetchAll("RECEIVED"),
    fetchAll("CONFIRMED"),
    fetchAll("RECEIVED_IN_CASH"),
  ]);

  // Remove duplicatas por id
  const seen = new Set<string>();
  const all = [...received, ...confirmed, ...receivedInCash].filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return all;
};

export const calcularValorAtualizado = (payment: any): {
  valorOriginal: number;
  multaValor: number;
  jurosValor: number;
  valorAtualizado: number;
  diasAtraso: number;
} => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(payment.dueDate + "T00:00:00");
  const diasAtraso = Math.max(0, Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)));

  const valorOriginal: number = payment.value || 0;

  // Usa interestValue do Asaas se já vier calculado
  if (payment.interestValue != null && payment.interestValue > 0) {
    return { valorOriginal, multaValor: 0, jurosValor: payment.interestValue, valorAtualizado: valorOriginal + payment.interestValue, diasAtraso };
  }

  // Calcula manualmente a partir das configurações do boleto
  const multaPerc: number = payment.fine?.value || 0;       // % única no vencimento
  const jurosPercMensal: number = payment.interest?.value || 0; // % ao mês

  const multaValor = diasAtraso > 0 ? valorOriginal * (multaPerc / 100) : 0;
  const jurosValor = diasAtraso > 0 ? valorOriginal * (jurosPercMensal / 100 / 30) * diasAtraso : 0;
  const valorAtualizado = valorOriginal + multaValor + jurosValor;

  return { valorOriginal, multaValor, jurosValor, valorAtualizado, diasAtraso };
};

export const extractLinhaDigitavelFromPdf = async (pdfBuffer: Buffer): Promise<string | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");
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
