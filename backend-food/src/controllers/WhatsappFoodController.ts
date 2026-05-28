import { Request, Response } from "express";
import FoodWhatsapp from "../models/FoodWhatsapp";
import { initWbotSession, getWbot } from "../libs/wbotFood";
import AppError from "../errors/AppError";

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const connections = await FoodWhatsapp.findAll({ where: { companyId } });
  return res.json(connections);
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name } = req.body;

  const existing = await FoodWhatsapp.findOne({ where: { companyId } });
  if (existing) throw new AppError("Já existe uma conexão WhatsApp para este restaurante", 400);

  const whatsapp = await FoodWhatsapp.create({
    companyId,
    name: name || "Conexão Restaurante",
    status: "OPENING"
  });

  await initWbotSession(whatsapp);

  return res.status(201).json(whatsapp);
};

export const disconnect = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const whatsapp = await FoodWhatsapp.findOne({ where: { id, companyId } });
  if (!whatsapp) throw new AppError("Conexão não encontrada", 404);

  try {
    const wbot = getWbot(whatsapp.id);
    await wbot.logout();
  } catch {
    // ignora se sessão não estava ativa
  }

  await whatsapp.update({ status: "DISCONNECTED", qrcode: null });
  return res.json({ message: "Desconectado" });
};
