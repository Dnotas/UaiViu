import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
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
    slug, welcomeMessage, msgOrderConfirmed, msgOrderPreparing,
    msgOrderOnTheWay, msgOrderDelivered, deliveryEnabled, pickupEnabled,
    deliveryFee, estimatedDeliveryMinutes, restaurantName, primaryColor,
    restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance, deliveryRates,
  } = req.body;

  let config = await FoodRestaurantConfig.findOne({ where: { companyId } });

  if (!config) {
    const finalSlug = slug
      ? slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : `restaurante-${companyId}-${uuidv4().split("-")[0]}`;

    const existing = await FoodRestaurantConfig.findOne({ where: { slug: finalSlug } });
    if (existing) throw new AppError("Slug já está em uso. Escolha outro.", 400);

    config = await FoodRestaurantConfig.create({
      companyId, slug: finalSlug, welcomeMessage, msgOrderConfirmed,
      msgOrderPreparing, msgOrderOnTheWay, msgOrderDelivered, deliveryEnabled,
      pickupEnabled, deliveryFee, estimatedDeliveryMinutes, restaurantName, primaryColor,
      restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance,
      deliveryRates: deliveryRates || [],
    });
  } else {
    if (slug && slug !== config.slug) {
      const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await FoodRestaurantConfig.findOne({ where: { slug: s } });
      if (existing && existing.id !== config.id) throw new AppError("Slug já está em uso.", 400);
      config.slug = s;
    }
    await config.update({
      welcomeMessage, msgOrderConfirmed, msgOrderPreparing, msgOrderOnTheWay,
      msgOrderDelivered, deliveryEnabled, pickupEnabled, deliveryFee,
      estimatedDeliveryMinutes, restaurantName, primaryColor,
      restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance,
      deliveryRates: deliveryRates || config.deliveryRates || [],
    });
  }

  return res.json(config);
};

const handleImageUpload = async (
  req: Request,
  res: Response,
  field: "logoUrl" | "bannerImageUrl"
): Promise<Response> => {
  const { companyId } = req.user;
  if (!req.file) throw new AppError("Nenhuma imagem enviada", 400);

  const config = await FoodRestaurantConfig.findOne({ where: { companyId } });
  if (!config) throw new AppError("Configure o restaurante primeiro", 400);

  // Remove arquivo antigo
  const oldUrl: string = (config as any)[field];
  if (oldUrl) {
    const oldPath = path.resolve(process.cwd(), oldUrl.replace(/^\//, ""));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const url = `/uploads/menu/${req.file.filename}`;
  await config.update({ [field]: url });
  return res.json({ [field]: url });
};

// POST /api/food/restaurant-config/upload-logo
export const uploadLogo = (req: Request, res: Response) =>
  handleImageUpload(req, res, "logoUrl");

// POST /api/food/restaurant-config/upload-banner
export const uploadBanner = (req: Request, res: Response) =>
  handleImageUpload(req, res, "bannerImageUrl");
