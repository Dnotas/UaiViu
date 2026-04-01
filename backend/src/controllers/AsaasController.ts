import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import AsaasConfig from "../models/AsaasConfig";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import {
  findCustomerByCpfCnpj,
  getPaymentsByCustomer,
  getPaymentById,
  buildBoletoMessage,
  buildBoletoPdfName,
  downloadBoletoPdf,
  calcularValorAtualizado,
  getAllOverduePayments,
  getCustomerById,
  formatCurrency,
  formatDate,
  extractLinhaDigitavelFromPdf,
} from "../services/AsaasService/AsaasApiService";
import GetTicketWbot from "../helpers/GetTicketWbot";
import CreateOrUpdateContactService from "../services/ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import formatBody from "../helpers/Mustache";

// ─── CRUD: Configs ───────────────────────────────────────────────────────────

export const listConfigs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const configs = await AsaasConfig.findAll({
    where: { companyId },
    order: [["createdAt", "ASC"]],
    attributes: ["id", "name", "environment", "active", "createdAt"],
    // token NOT returned for security
  });
  return res.json(configs);
};

export const createConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, token, environment } = req.body;
  if (!name || !token) throw new AppError("Nome e token são obrigatórios", 400);
  const config = await AsaasConfig.create({ name, token, environment: environment || "production", active: true, companyId });
  return res.status(201).json({ id: config.id, name: config.name, environment: config.environment, active: config.active });
};

export const updateConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, token, environment, active } = req.body;
  const config = await AsaasConfig.findOne({ where: { id, companyId } });
  if (!config) throw new AppError("Configuração não encontrada", 404);
  await config.update({ name, token: token || config.token, environment, active });
  return res.json({ id: config.id, name: config.name, environment: config.environment, active: config.active });
};

export const deleteConfig = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const config = await AsaasConfig.findOne({ where: { id, companyId } });
  if (!config) throw new AppError("Configuração não encontrada", 404);
  await config.destroy();
  return res.json({ message: "Configuração removida" });
};

// ─── API endpoint: send-boleto ────────────────────────────────────────────────

export const sendBoleto = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params as unknown as { whatsappId: number };
    const { cpfCnpj, number, status, month } = req.body;

    if (!cpfCnpj) throw new AppError("CPF/CNPJ é obrigatório", 400);
    if (!number) throw new AppError("Número de WhatsApp é obrigatório", 400);

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) throw new AppError("Conexão WhatsApp não encontrada", 404);

    const companyId = whatsapp.companyId;

    // Find active Asaas config for this company
    const asaasConfig = await AsaasConfig.findOne({
      where: { companyId, active: true },
      order: [["createdAt", "ASC"]],
    });
    if (!asaasConfig) throw new AppError("Nenhuma configuração Asaas ativa encontrada. Cadastre um token Asaas.", 404);

    // Find customer in Asaas
    const customers = await findCustomerByCpfCnpj(asaasConfig.token, asaasConfig.environment, cpfCnpj);
    if (!customers || customers.length === 0) {
      throw new AppError(`Nenhum cliente encontrado no Asaas com o CPF/CNPJ informado: ${cpfCnpj}`, 404);
    }
    const customer = customers[0];

    // Get payments
    const payments = await getPaymentsByCustomer(
      asaasConfig.token,
      asaasConfig.environment,
      customer.id,
      { status: status || "ALL", month: month || null }
    );

    if (!payments || payments.length === 0) {
      return res.json({ message: "Nenhuma cobrança encontrada para os filtros informados.", sent: 0, payments: [] });
    }

    // Create/find contact and ticket
    const CheckValidNumber = await CheckContactNumber(number, companyId);
    const cleanNumber = CheckValidNumber.jid.replace(/\D/g, "");
    const profilePicUrl = await GetProfilePicUrl(cleanNumber, companyId);

    const contactData = {
      name: customer.name || cleanNumber,
      number: cleanNumber,
      profilePicUrl,
      isGroup: false,
      companyId,
    };

    const contact = await CreateOrUpdateContactService(contactData);
    const ticket = await FindOrCreateTicketService(contact, whatsapp.id!, 0, companyId);

    // Send each payment
    const wbot = await GetTicketWbot(ticket);
    const numberJid = `${contact.number}@s.whatsapp.net`;
    const results = [];
    for (const payment of payments) {
      // 1. Text message: cordial, vencimento + link
      const msg = buildBoletoMessage(payment);
      await SendWhatsAppMessage({ body: formatBody(msg, contact), ticket });

      // 2. PDF attachment (BOLETO only, best-effort)
      if (payment.billingType === "BOLETO" && payment.bankSlipUrl) {
        const pdfBuffer = await downloadBoletoPdf(payment.bankSlipUrl);
        if (pdfBuffer) {
          await wbot.sendMessage(numberJid, {
            document: pdfBuffer,
            fileName: buildBoletoPdfName(customer.name, payment.dueDate, customer.cpfCnpj),
            mimetype: "application/pdf",
          });
        }
      }

      results.push({ id: payment.id, description: payment.description, value: payment.value, status: payment.status });
    }

    await ticket.update({ lastMessage: `Cobranças enviadas: ${payments.length}` });

    return res.json({
      message: `${payments.length} cobrança(s) enviada(s) com sucesso.`,
      customer: { id: customer.id, name: customer.name, cpfCnpj: customer.cpfCnpj },
      sent: results.length,
      payments: results,
    });
  } catch (err: any) {
    Sentry.captureException(err);
    if (err instanceof AppError) throw err;
    if (err?.response?.data) {
      throw new AppError(`Erro Asaas: ${JSON.stringify(err.response.data)}`, 400);
    }
    throw new AppError(err?.message || "Erro ao enviar cobranças", 500);
  }
};

// ─── Helpers compartilhados entre os novos endpoints ─────────────────────────

const resolveAsaasConfigAndCustomer = async (whatsappId: string, cpfCnpj: string) => {
  if (!cpfCnpj) throw new AppError("CPF/CNPJ é obrigatório", 400);

  const whatsapp = await Whatsapp.findByPk(whatsappId);
  if (!whatsapp) throw new AppError("Conexão WhatsApp não encontrada", 404);
  const companyId = whatsapp.companyId;

  const asaasConfig = await AsaasConfig.findOne({
    where: { companyId, active: true },
    order: [["createdAt", "ASC"]],
  });
  if (!asaasConfig) throw new AppError("Nenhuma configuração Asaas ativa encontrada. Cadastre um token Asaas.", 404);

  const customers = await findCustomerByCpfCnpj(asaasConfig.token, asaasConfig.environment, cpfCnpj);
  if (!customers || customers.length === 0) {
    throw new AppError(`Nenhum cliente encontrado no Asaas com o CPF/CNPJ informado: ${cpfCnpj}`, 404);
  }

  return { asaasConfig, customer: customers[0] };
};

// ─── API endpoint: get-boleto (retorna o PDF) ─────────────────────────────────

export const getBoletoPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const { whatsappId } = req.params;
    const { cpfCnpj, status, month } = req.query as Record<string, string>;

    const { asaasConfig, customer } = await resolveAsaasConfigAndCustomer(whatsappId, cpfCnpj);

    const payments = await getPaymentsByCustomer(
      asaasConfig.token,
      asaasConfig.environment,
      customer.id,
      { status: status || "ALL", month: month || null }
    );

    const boletos = payments.filter(p => p.billingType === "BOLETO" && p.bankSlipUrl);
    if (boletos.length === 0) {
      throw new AppError("Nenhum boleto com PDF disponível encontrado para os filtros informados.", 404);
    }

    // Retorna o primeiro boleto encontrado (use month/status para refinar)
    const payment = boletos[0];
    const pdfBuffer = await downloadBoletoPdf(payment.bankSlipUrl);
    if (!pdfBuffer) throw new AppError("Não foi possível baixar o PDF do boleto", 502);

    const fileName = buildBoletoPdfName(customer.name, payment.dueDate, customer.cpfCnpj);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    Sentry.captureException(err);
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "Erro ao buscar boleto", 500);
  }
};

// ─── API endpoint: get-linha-digitavel ────────────────────────────────────────

export const getLinhaDigitavel = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { whatsappId } = req.params;
    const { cpfCnpj, status, month } = req.query as Record<string, string>;

    const { asaasConfig, customer } = await resolveAsaasConfigAndCustomer(whatsappId, cpfCnpj);

    const payments = await getPaymentsByCustomer(
      asaasConfig.token,
      asaasConfig.environment,
      customer.id,
      { status: status || "ALL", month: month || null }
    );

    const boletosRaw = payments.filter(p => p.billingType === "BOLETO");
    console.log(`[ASAAS DEBUG] Total boletos encontrados: ${boletosRaw.length}`);

    const boletos = await Promise.all(
      boletosRaw.map(async p => {
        console.log(`[ASAAS DEBUG] payment ${p.id} | identificationField: ${p.identificationField} | bankSlipUrl: ${p.bankSlipUrl}`);

        // 1. Tenta pelo campo da listagem
        let linhaDigitavel: string | null = p.identificationField || null;

        // 2. Tenta buscando o pagamento individualmente
        if (!linhaDigitavel) {
          const full = await getPaymentById(asaasConfig.token, asaasConfig.environment, p.id);
          console.log(`[ASAAS DEBUG] busca individual ${p.id} | identificationField: ${full?.identificationField} | bankSlipUrl: ${full?.bankSlipUrl}`);
          linhaDigitavel = full?.identificationField || null;

          // usa bankSlipUrl da busca individual se o da listagem estava vazio
          if (!p.bankSlipUrl && full?.bankSlipUrl) p.bankSlipUrl = full.bankSlipUrl;
        }

        // 3. Último recurso: extrai o texto do PDF do boleto
        if (!linhaDigitavel && p.bankSlipUrl) {
          console.log(`[ASAAS DEBUG] tentando extrair do PDF: ${p.bankSlipUrl}`);
          const pdfBuffer = await downloadBoletoPdf(p.bankSlipUrl);
          console.log(`[ASAAS DEBUG] pdfBuffer obtido: ${pdfBuffer ? pdfBuffer.length + " bytes" : "null"}`);
          if (pdfBuffer) {
            linhaDigitavel = await extractLinhaDigitavelFromPdf(pdfBuffer);
            console.log(`[ASAAS DEBUG] linhaDigitavel extraída do PDF: ${linhaDigitavel}`);
          }
        }

        return {
          paymentId: p.id,
          linhaDigitavel,
          value: p.value,
          dueDate: p.dueDate,
          status: p.status,
        };
      })
    );

    if (boletos.length === 0) {
      throw new AppError("Nenhum boleto encontrado para os filtros informados.", 404);
    }

    return res.json({
      customer: { id: customer.id, name: customer.name, cpfCnpj: customer.cpfCnpj },
      total: boletos.length,
      boletos,
    });
  } catch (err: any) {
    Sentry.captureException(err);
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "Erro ao buscar linha digitável", 500);
  }
};

// ─── API endpoint: boletos-vencidos (com juros recalculados) ──────────────────

export const getBoletosVencidos = async (req: Request, res: Response): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const archiver = require("archiver");

    const { whatsappId } = req.params;
    const { cpfCnpj, month } = req.query as Record<string, string>;

    const { asaasConfig, customer } = await resolveAsaasConfigAndCustomer(whatsappId, cpfCnpj);

    const payments = await getPaymentsByCustomer(
      asaasConfig.token,
      asaasConfig.environment,
      customer.id,
      { status: "OVERDUE", month: month || null }
    );

    const boletos = payments.filter(p => p.billingType === "BOLETO" && p.bankSlipUrl);
    if (boletos.length === 0) throw new AppError("Nenhum boleto vencido com PDF disponível.", 404);

    // Baixa todos os PDFs
    const pdfs: { buffer: Buffer; fileName: string }[] = [];
    for (const p of boletos) {
      const pdfBuffer = await downloadBoletoPdf(p.bankSlipUrl);
      if (!pdfBuffer) continue;
      pdfs.push({ buffer: pdfBuffer, fileName: buildBoletoPdfName(customer.name, p.dueDate, customer.cpfCnpj) });
    }

    if (pdfs.length === 0) throw new AppError("Não foi possível baixar nenhum PDF.", 502);

    // Um boleto → PDF direto
    if (pdfs.length === 1) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${pdfs[0].fileName}"`);
      res.send(pdfs[0].buffer);
      return;
    }

    // Vários boletos → ZIP
    const zipName = `boletos_vencidos_${customer.cpfCnpj?.replace(/\D/g, "") || "cliente"}${month ? `_${month}` : ""}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(res);
    for (const { buffer, fileName } of pdfs) {
      archive.append(buffer, { name: fileName });
    }
    await archive.finalize();
  } catch (err: any) {
    Sentry.captureException(err);
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "Erro ao buscar boletos vencidos", 500);
  }
};

// ─── API endpoint: todos-vencidos (ZIP com todos os PDFs) ────────────────────

export const getTodosBoletosVencidos = async (req: Request, res: Response): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const archiver = require("archiver");

    const { whatsappId } = req.params;
    const { month } = req.query as Record<string, string>;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp) throw new AppError("Conexão WhatsApp não encontrada", 404);
    const companyId = whatsapp.companyId;

    const asaasConfig = await AsaasConfig.findOne({
      where: { companyId, active: true },
      order: [["createdAt", "ASC"]],
    });
    if (!asaasConfig) throw new AppError("Nenhuma configuração Asaas ativa encontrada", 404);

    const payments = await getAllOverduePayments(asaasConfig.token, asaasConfig.environment, month || undefined);
    if (!payments || payments.length === 0) throw new AppError("Nenhum boleto vencido encontrado.", 404);

    // Cache de clientes
    const customerCache: Record<string, any> = {};
    const getCustomer = async (customerId: string) => {
      if (!customerCache[customerId]) {
        customerCache[customerId] = await getCustomerById(asaasConfig.token, asaasConfig.environment, customerId);
      }
      return customerCache[customerId];
    };

    const zipName = month ? `boletos_vencidos_${month}.zip` : `boletos_vencidos_todos.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(res);

    for (const p of payments) {
      if (!p.bankSlipUrl) continue;
      const customer = await getCustomer(p.customer);
      const pdfBuffer = await downloadBoletoPdf(p.bankSlipUrl);
      if (!pdfBuffer) continue;
      const fileName = buildBoletoPdfName(customer?.name || "CLIENTE", p.dueDate, customer?.cpfCnpj);
      archive.append(pdfBuffer, { name: fileName });
    }

    await archive.finalize();
  } catch (err: any) {
    Sentry.captureException(err);
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "Erro ao gerar ZIP dos boletos vencidos", 500);
  }
};
