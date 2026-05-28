import { Request, Response } from "express";
import FoodPaymentConfig from "../models/FoodPaymentConfig";

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const config = await FoodPaymentConfig.findOne({ where: { companyId } });
  // Não retorna tokens sensíveis ao frontend
  if (!config) return res.json(null);
  return res.json({
    id: config.id,
    cashEnabled: config.cashEnabled,
    pixEnabled: config.pixEnabled,
    pixKey: config.pixKey,
    pixKeyType: config.pixKeyType,
    pixReceiverName: config.pixReceiverName,
    cardEnabled: config.cardEnabled,
    cardProvider: config.cardProvider,
    cardPublicKey: config.cardPublicKey,
    // cardAccessToken NÃO é retornado — apenas salvo
  });
};

export const upsert = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    cashEnabled,
    pixEnabled,
    pixKey,
    pixKeyType,
    pixReceiverName,
    cardEnabled,
    cardProvider,
    cardPublicKey,
    cardAccessToken,
  } = req.body;

  let config = await FoodPaymentConfig.findOne({ where: { companyId } });

  if (!config) {
    config = await FoodPaymentConfig.create({
      companyId,
      cashEnabled,
      pixEnabled,
      pixKey,
      pixKeyType,
      pixReceiverName,
      cardEnabled,
      cardProvider,
      cardPublicKey,
      cardAccessToken,
    });
  } else {
    const updates: any = {
      cashEnabled,
      pixEnabled,
      pixKey,
      pixKeyType,
      pixReceiverName,
      cardEnabled,
      cardProvider,
      cardPublicKey,
    };
    // Só atualiza o token se foi enviado
    if (cardAccessToken) updates.cardAccessToken = cardAccessToken;
    await config.update(updates);
  }

  return res.json({ message: "Configuração de pagamento salva" });
};

// Retorna as formas disponíveis para o cardápio público (sem dados sensíveis)
export const publicPaymentMethods = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;
  const FoodRestaurantConfig = require("../models/FoodRestaurantConfig").default;
  const restaurant = await FoodRestaurantConfig.findOne({ where: { slug } });
  if (!restaurant) return res.json({ methods: [] });

  const config = await FoodPaymentConfig.findOne({ where: { companyId: restaurant.companyId } });
  if (!config) return res.json({ methods: [{ type: "cash", label: "Pagar na entrega" }] });

  const methods = [];
  if (config.cashEnabled) methods.push({ type: "cash", label: "Pagar na entrega" });
  if (config.pixEnabled) methods.push({ type: "pix", label: "PIX", pixKey: config.pixKey, pixKeyType: config.pixKeyType, pixReceiverName: config.pixReceiverName });
  if (config.cardEnabled) methods.push({ type: "card", label: "Cartão", provider: config.cardProvider, publicKey: config.cardPublicKey });

  return res.json({ methods });
};
