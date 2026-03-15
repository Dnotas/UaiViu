import axios from "axios";

const getBaseUrl = (environment: string): string => {
  return environment === "sandbox"
    ? "https://sandbox.asaas.com/api/v3"
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
    const [year, month] = filters.month.split("-");
    const pad = (n: string) => n.padStart(2, "0");
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    params["dueDate[ge]"] = `${year}-${pad(month)}-01`;
    params["dueDate[le]"] = `${year}-${pad(month)}-${daysInMonth}`;
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
  const status = formatStatus(payment.status);
  const value = formatCurrency(payment.value);
  const dueDate = formatDate(payment.dueDate);
  const description = payment.description || payment.billingType || "Cobrança";
  const link = payment.invoiceUrl || payment.bankSlipUrl || "";

  let msg = `🔔 *Aviso de Cobrança*\n\n`;
  msg += `📋 *Descrição:* ${description}\n`;
  msg += `💰 *Valor:* ${value}\n`;
  msg += `📅 *Vencimento:* ${dueDate}\n`;
  msg += `📌 *Status:* ${status}\n`;
  if (link) {
    msg += `\n💳 *Link para pagamento:*\n${link}`;
  }
  msg += `\n\nEm caso de dúvidas, entre em contato conosco.`;
  return msg;
};
