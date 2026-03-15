import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import AsaasConfig from "../models/AsaasConfig";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import {
  findCustomerByCpfCnpj,
  getPaymentsByCustomer,
  buildBoletoMessage,
} from "../services/AsaasService/AsaasApiService";
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
    const results = [];
    for (const payment of payments) {
      const msg = buildBoletoMessage(payment);
      await SendWhatsAppMessage({ body: formatBody(msg, contact), ticket });
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
