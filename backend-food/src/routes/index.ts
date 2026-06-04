import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { uploadMenu } from "../middleware/uploadMenu";

import * as RestaurantConfigController from "../controllers/RestaurantConfigController";
import * as MenuController from "../controllers/MenuController";
import * as OrderController from "../controllers/OrderController";
import * as PaymentConfigController from "../controllers/PaymentConfigController";
import * as WhatsappFoodController from "../controllers/WhatsappFoodController";
import * as ConversationController from "../controllers/ConversationController";

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
router.delete("/menu/items/:id", isAuth, MenuController.deleteItem);

// ─── Pedidos — painel do restaurante (autenticado) ────────────────────────────
router.get("/orders", isAuth, OrderController.list);
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
router.delete("/whatsapp/:id", isAuth, WhatsappFoodController.remove);

// ─── Endpoints PÚBLICOS (sem auth — acessados pelo cliente final) ─────────────
// Cardápio público
router.get("/public/:slug/menu", async (req, res) => {
  const FoodMenuGroup = require("../models/FoodMenuGroup").default;
  const FoodMenuItem = require("../models/FoodMenuItem").default;
  const FoodRestaurantConfig = require("../models/FoodRestaurantConfig").default;

  const config = await FoodRestaurantConfig.findOne({ where: { slug: req.params.slug } });
  if (!config) return res.status(404).json({ error: "Restaurante não encontrado" });

  const groups = await FoodMenuGroup.findAll({
    where: { companyId: config.companyId, active: true },
    include: [{ model: FoodMenuItem, where: { active: true }, required: false }],
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
    },
    groups
  });
});

// Formas de pagamento disponíveis
router.get("/public/:slug/payment-methods", PaymentConfigController.publicPaymentMethods);

// Consultar dados da sessão (para preencher telefone automaticamente)
router.get("/public/session/:token", (req, res) => {
  const { getJidBySession } = require("../services/wbot/FoodMessageHandler");
  const session = getJidBySession(req.params.token);
  return res.json({ phone: session?.phone || "" });
});

// Criar pedido
router.post("/public/:slug/orders", OrderController.createPublicOrder);

// Link do motoboy
router.get("/delivery/:token", OrderController.getDeliveryInfo);
router.post("/delivery/:token/confirm", OrderController.confirmDelivery);

export default router;
