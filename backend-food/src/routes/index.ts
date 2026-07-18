import { Router } from "express";

const isStoreOpenNow = (businessHours: Array<{ dayOfWeek: number; enabled: boolean; open: string; close: string }> | null): boolean => {
  if (!businessHours || businessHours.length === 0) return true;
  const now = new Date();
  const day = now.getDay();
  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const current = `${hh}:${mm}`;
  const today = businessHours.find(h => h.dayOfWeek === day);
  if (!today || !today.enabled) return false;
  return current >= today.open && current < today.close;
};
import isAuth from "../middleware/isAuth";
import { uploadMenu, uploadAI } from "../middleware/uploadMenu";

import * as RestaurantConfigController from "../controllers/RestaurantConfigController";
import * as MenuController from "../controllers/MenuController";
import * as OrderController from "../controllers/OrderController";
import * as PaymentConfigController from "../controllers/PaymentConfigController";
import * as WhatsappFoodController from "../controllers/WhatsappFoodController";
import * as ConversationController from "../controllers/ConversationController";
import * as ComplementController from "../controllers/ComplementController";
import * as AIImportController from "../controllers/AIImportController";
import * as CouponController from "../controllers/CouponController";

const router = Router();

// ─── Configuração do restaurante (autenticado) ────────────────────────────────
router.get("/restaurant-config", isAuth, RestaurantConfigController.show);
router.post("/restaurant-config", isAuth, RestaurantConfigController.upsert);
router.post("/restaurant-config/upload-logo", isAuth, uploadMenu.single("image"), RestaurantConfigController.uploadLogo);
router.post("/restaurant-config/upload-banner", isAuth, uploadMenu.single("image"), RestaurantConfigController.uploadBanner);

// ─── Cardápio — grupos (autenticado) ─────────────────────────────────────────
router.get("/menu/groups", isAuth, MenuController.listGroups);
router.post("/menu/groups", isAuth, uploadMenu.single("image"), MenuController.createGroup);
router.put("/menu/groups/:id", isAuth, uploadMenu.single("image"), MenuController.updateGroup);
router.delete("/menu/groups/:id", isAuth, MenuController.deleteGroup);

// ─── Cardápio — itens (autenticado) ──────────────────────────────────────────
router.get("/menu/groups/:groupId/items", isAuth, MenuController.listItems);
router.post("/menu/groups/:groupId/items", isAuth, uploadMenu.single("image"), MenuController.createItem);
router.put("/menu/items/:id", isAuth, uploadMenu.single("image"), MenuController.updateItem);
router.patch("/menu/items/:id/available", isAuth, MenuController.toggleAvailable);
router.delete("/menu/items/:id", isAuth, MenuController.deleteItem);

// ─── Complementos de item (autenticado) ──────────────────────────────────────
router.get("/menu/items/:itemId/complements", isAuth, ComplementController.listComplements);
router.post("/menu/items/:itemId/complements", isAuth, ComplementController.saveComplements);

// ─── Complementos em massa por grupo (aplica em todos os itens do grupo) ──────
router.post("/menu/groups/:groupId/bulk-complements", isAuth, ComplementController.saveGroupComplements);

// ─── Importação IA (autenticado) ─────────────────────────────────────────────
router.post("/menu/ai-import", isAuth, uploadAI.array("files", 10), AIImportController.analyzeMenu);
router.post("/menu/ai-import/save", isAuth, AIImportController.saveImportedItems);

// ─── Cupons de desconto (autenticado) ────────────────────────────────────────
router.get("/coupons", isAuth, CouponController.list);
router.post("/coupons", isAuth, CouponController.create);
router.put("/coupons/:id", isAuth, CouponController.update);
router.delete("/coupons/:id", isAuth, CouponController.remove);

// ─── Pedidos — painel do restaurante (autenticado) ────────────────────────────
router.get("/orders", isAuth, OrderController.list);
router.delete("/orders", isAuth, OrderController.deleteByPeriod);
router.get("/orders/:id", isAuth, OrderController.show);
router.patch("/orders/:id/status", isAuth, OrderController.updateStatus);

// ─── Pagamentos (autenticado) ─────────────────────────────────────────────────
router.get("/payment-config", isAuth, PaymentConfigController.show);
router.post("/payment-config", isAuth, PaymentConfigController.upsert);

// ─── Conversas (autenticado) ──────────────────────────────────────────────────
router.get("/conversations", isAuth, ConversationController.listConversations);
router.get("/conversations/:id/messages", isAuth, ConversationController.getMessages);
router.post("/conversations/:id/messages", isAuth, ConversationController.sendMessage);
router.patch("/conversations/:id/read", isAuth, ConversationController.markRead);
router.delete("/conversations/:id", isAuth, ConversationController.deleteConversation);

// ─── WhatsApp (autenticado) ───────────────────────────────────────────────────
router.get("/whatsapp", isAuth, WhatsappFoodController.list);
router.post("/whatsapp", isAuth, WhatsappFoodController.create);
router.post("/whatsapp/:id/disconnect", isAuth, WhatsappFoodController.disconnect);
router.post("/whatsapp/:id/reconnect", isAuth, WhatsappFoodController.reconnect);
router.post("/whatsapp/:id/restart", isAuth, WhatsappFoodController.restartSession);
router.delete("/whatsapp/:id", isAuth, WhatsappFoodController.remove);

// ─── Endpoints PÚBLICOS (sem auth — acessados pelo cliente final) ─────────────
// Cardápio público
router.get("/public/:slug/menu", async (req, res) => {
  const FoodMenuGroup = require("../models/FoodMenuGroup").default;
  const FoodMenuItem = require("../models/FoodMenuItem").default;
  const FoodRestaurantConfig = require("../models/FoodRestaurantConfig").default;
  const FoodItemComplement = require("../models/FoodItemComplement").default;

  const config = await FoodRestaurantConfig.findOne({ where: { slug: req.params.slug } });
  if (!config) return res.status(404).json({ error: "Restaurante não encontrado" });

  const groups = await FoodMenuGroup.findAll({
    where: { companyId: config.companyId, active: true },
    include: [{
      model: FoodMenuItem,
      where: { active: true },
      required: false,
      include: [{ model: FoodItemComplement, where: { active: true }, required: false }],
    }],
    order: [["sortOrder", "ASC"], [{ model: FoodMenuItem, as: "items" }, "sortOrder", "ASC"]]
  });

  return res.json({
    restaurant: {
      slug: config.slug,
      deliveryFee: config.deliveryFee,
      estimatedMinutes: config.estimatedDeliveryMinutes,
      deliveryEnabled: config.deliveryEnabled,
      pickupEnabled: config.pickupEnabled,
      restaurantName: config.restaurantName,
      primaryColor: config.primaryColor || "#FF5722",
      logoUrl: config.logoUrl,
      bannerImageUrl: config.bannerImageUrl,
      deliveryByDistance: config.deliveryByDistance || false,
      restaurantLat: config.restaurantLat || null,
      restaurantLng: config.restaurantLng || null,
      deliveryRates: config.deliveryRates || [],
      deliveryRatesByLocation: config.deliveryRatesByLocation || [],
      busyMode: config.busyMode || false,
      storeStatus: config.storeStatus || "open",
      closedMessage: config.closedMessage || null,
      businessHours: config.businessHours || null,
      isCurrentlyOpen: isStoreOpenNow(config.businessHours),
    },
    groups
  });
});

// Formas de pagamento disponíveis
router.get("/public/:slug/payment-methods", PaymentConfigController.publicPaymentMethods);

// Buscar dados do cliente pelo telefone (auto-preenchimento no cardápio)
router.get("/public/:slug/customer/:phone", async (req, res) => {
  const FoodRestaurantConfig = require("../models/FoodRestaurantConfig").default;
  const FoodCustomer = require("../models/FoodCustomer").default;

  const config = await FoodRestaurantConfig.findOne({ where: { slug: req.params.slug } });
  if (!config) return res.status(404).json({ error: "Restaurante não encontrado" });

  const phone = req.params.phone.replace(/\D/g, "");
  const customer = await FoodCustomer.findOne({ where: { companyId: config.companyId, phone } });
  if (!customer) return res.json(null);

  return res.json({
    customerName: customer.customerName,
    cep: customer.cep,
    customerAddress: customer.customerAddress,
    customerAddressNumber: customer.customerAddressNumber,
    customerAddressComplement: customer.customerAddressComplement,
    customerNeighborhood: customer.customerNeighborhood,
    customerCity: customer.customerCity,
  });
});

// Consultar dados da sessão (para preencher telefone automaticamente)
router.get("/public/session/:token", async (req, res) => {
  const { getJidBySession } = require("../services/wbot/FoodMessageHandler");
  const session = await getJidBySession(req.params.token);
  return res.json({ phone: session?.phone || "" });
});

// Validar cupom
router.post("/public/:slug/coupons/validate", CouponController.validatePublic);

// Criar pedido
router.post("/public/:slug/orders", OrderController.createPublicOrder);

// Link do motoboy
router.get("/delivery/:token", OrderController.getDeliveryInfo);
router.post("/delivery/:token/confirm", OrderController.confirmDelivery);

export default router;
