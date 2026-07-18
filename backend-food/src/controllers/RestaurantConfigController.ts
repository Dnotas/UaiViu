import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import FoodConversation from "../models/FoodConversation";
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
    msgOrderOnTheWay, msgOrderReadyForPickup, msgOrderDelivered, deliveryEnabled, pickupEnabled,
    deliveryFee, estimatedDeliveryMinutes, restaurantName, primaryColor,
    restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance, deliveryRates,
    deliveryRatesByLocation,
    busyMode, storeStatus, closedMessage, divulgationMessage, businessHours,
    whatsappSilentMode, whatsappSilentMessage,
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
      msgOrderPreparing, msgOrderOnTheWay, msgOrderReadyForPickup, msgOrderDelivered,
      deliveryEnabled, pickupEnabled, deliveryFee, estimatedDeliveryMinutes,
      restaurantName, primaryColor,
      restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance,
      deliveryRates: deliveryRates || [],
      deliveryRatesByLocation: deliveryRatesByLocation || [],
      busyMode: busyMode ?? false,
      storeStatus: storeStatus || "open",
      closedMessage: closedMessage || null,
      divulgationMessage: divulgationMessage || null,
      businessHours: businessHours || null,
      whatsappSilentMode: whatsappSilentMode ?? false,
      whatsappSilentMessage: whatsappSilentMessage || undefined,
    });
  } else {
    if (slug && slug !== config.slug) {
      const s = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const existing = await FoodRestaurantConfig.findOne({ where: { slug: s } });
      if (existing && existing.id !== config.id) throw new AppError("Slug já está em uso.", 400);
      config.slug = s;
    }

    const previousStatus = config.storeStatus;
    const newStatus = storeStatus || config.storeStatus;

    await config.update({
      welcomeMessage, msgOrderConfirmed, msgOrderPreparing, msgOrderOnTheWay,
      msgOrderReadyForPickup: msgOrderReadyForPickup !== undefined ? msgOrderReadyForPickup : config.msgOrderReadyForPickup,
      msgOrderDelivered, deliveryEnabled, pickupEnabled, deliveryFee,
      estimatedDeliveryMinutes, restaurantName, primaryColor,
      restaurantAddress, restaurantLat, restaurantLng, deliveryByDistance,
      deliveryRates: deliveryRates || config.deliveryRates || [],
      deliveryRatesByLocation: deliveryRatesByLocation || config.deliveryRatesByLocation || [],
      busyMode: busyMode ?? config.busyMode,
      storeStatus: newStatus,
      closedMessage: closedMessage !== undefined ? closedMessage : config.closedMessage,
      divulgationMessage: divulgationMessage !== undefined ? divulgationMessage : config.divulgationMessage,
      businessHours: businessHours !== undefined ? businessHours : config.businessHours,
      whatsappSilentMode: whatsappSilentMode ?? config.whatsappSilentMode,
      whatsappSilentMessage: whatsappSilentMessage !== undefined ? whatsappSilentMessage : config.whatsappSilentMessage,
    });

    // Quando a loja reabre, reseta greetedAt de todas as conversas
    // para que os clientes recebam o link do cardápio atualizado
    if (previousStatus !== "open" && newStatus === "open") {
      await FoodConversation.update(
        { greetedAt: null },
        { where: { companyId } }
      );
      console.log(`[Config] Loja ${companyId} reaberta — greetedAt resetado para todas as conversas`);
    }
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
