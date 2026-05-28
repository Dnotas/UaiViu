import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import AppError from "../errors/AppError";

// GET /api/food/restaurant-config
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const config = await FoodRestaurantConfig.findOne({ where: { companyId } });
  if (!config) {
    return res.json(null);
  }
  return res.json(config);
};

// POST /api/food/restaurant-config  (cria ou atualiza)
export const upsert = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    slug,
    welcomeMessage,
    msgOrderConfirmed,
    msgOrderPreparing,
    msgOrderOnTheWay,
    msgOrderDelivered,
    deliveryEnabled,
    pickupEnabled,
    deliveryFee,
    estimatedDeliveryMinutes,
  } = req.body;

  let config = await FoodRestaurantConfig.findOne({ where: { companyId } });

  if (!config) {
    // Gera slug a partir do nome se não fornecido
    const finalSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : `restaurante-${companyId}-${uuidv4().split("-")[0]}`;

    const existing = await FoodRestaurantConfig.findOne({ where: { slug: finalSlug } });
    if (existing) throw new AppError("Slug já está em uso. Escolha outro.", 400);

    config = await FoodRestaurantConfig.create({
      companyId,
      slug: finalSlug,
      welcomeMessage,
      msgOrderConfirmed,
      msgOrderPreparing,
      msgOrderOnTheWay,
      msgOrderDelivered,
      deliveryEnabled,
      pickupEnabled,
      deliveryFee,
      estimatedDeliveryMinutes,
    });
  } else {
    if (slug && slug !== config.slug) {
      const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await FoodRestaurantConfig.findOne({ where: { slug: s } });
      if (existing && existing.id !== config.id) throw new AppError("Slug já está em uso.", 400);
      config.slug = s;
    }
    await config.update({
      welcomeMessage,
      msgOrderConfirmed,
      msgOrderPreparing,
      msgOrderOnTheWay,
      msgOrderDelivered,
      deliveryEnabled,
      pickupEnabled,
      deliveryFee,
      estimatedDeliveryMinutes,
    });
  }

  return res.json(config);
};
