import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import FoodOrder from "../models/FoodOrder";
import FoodOrderItem from "../models/FoodOrderItem";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import FoodWhatsapp from "../models/FoodWhatsapp";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import { getWbot } from "../libs/wbotFood";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sendWhatsAppStatusMessage = async (order: FoodOrder, message: string) => {
  try {
    const whatsapp = await FoodWhatsapp.findOne({
      where: { companyId: order.companyId, status: "CONNECTED" }
    });
    if (!whatsapp) return;

    const wbot = getWbot(whatsapp.id);
    const jid = `${order.customerPhone}@s.whatsapp.net`;
    await wbot.sendMessage(jid, { text: message });
  } catch (err) {
    console.error("[OrderController] Erro ao enviar mensagem WhatsApp:", err);
  }
};

// ─── Endpoints do painel do restaurante (autenticados) ────────────────────────

// GET /api/food/orders
export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { status, date } = req.query as Record<string, string>;

  const where: any = { companyId };
  if (status) where.status = status;

  const orders = await FoodOrder.findAll({
    where,
    include: [FoodOrderItem],
    order: [["createdAt", "DESC"]]
  });

  return res.json(orders);
};

// GET /api/food/orders/:id
export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const order = await FoodOrder.findOne({
    where: { id, companyId },
    include: [FoodOrderItem]
  });
  if (!order) throw new AppError("Pedido não encontrado", 404);
  return res.json(order);
};

// PATCH /api/food/orders/:id/status
export const updateStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["confirmed", "preparing", "on_the_way", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) throw new AppError("Status inválido", 400);

  const order = await FoodOrder.findOne({ where: { id, companyId } });
  if (!order) throw new AppError("Pedido não encontrado", 404);

  await order.update({ status });

  // Envia mensagem WhatsApp automática
  const config = await FoodRestaurantConfig.findOne({ where: { companyId } });
  if (config) {
    const msgMap: Record<string, string> = {
      confirmed: config.msgOrderConfirmed,
      preparing: config.msgOrderPreparing,
      on_the_way: config.msgOrderOnTheWay,
      delivered: config.msgOrderDelivered,
    };
    if (msgMap[status]) {
      await sendWhatsAppStatusMessage(order, msgMap[status]);
    }
  }

  // Notifica via socket o painel
  const io = getIO();
  io.to(`food-company-${companyId}`).emit("food-order-update", {
    action: "update",
    order: { id: order.id, status }
  });

  return res.json(order);
};

// ─── Endpoint público — criação de pedido pelo cliente final ─────────────────

// POST /api/food/public/:slug/orders
export const createPublicOrder = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;

  const config = await FoodRestaurantConfig.findOne({ where: { slug } });
  if (!config) throw new AppError("Restaurante não encontrado", 404);

  const {
    customerName,
    customerPhone,
    customerAddress,
    customerAddressNumber,
    customerAddressComplement,
    customerNeighborhood,
    paymentMethod,
    orderType,
    notes,
    items
  } = req.body;

  if (!items || !items.length) throw new AppError("Carrinho vazio", 400);
  if (!paymentMethod) throw new AppError("Forma de pagamento é obrigatória", 400);
  if (!customerPhone) throw new AppError("Telefone é obrigatório", 400);

  // Calcula subtotal
  const subtotal: number = items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0);
  const deliveryFee = orderType === "delivery" ? Number(config.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  const order = await FoodOrder.create({
    companyId: config.companyId,
    customerName,
    customerPhone: customerPhone.replace(/\D/g, ""),
    customerAddress,
    customerAddressNumber,
    customerAddressComplement,
    customerNeighborhood,
    subtotal,
    deliveryFee,
    total,
    status: "pending",
    paymentMethod,
    paymentStatus: "pending",
    deliveryToken: uuidv4(),
    orderType: orderType || "delivery",
    notes
  });

  // Cria os itens
  await Promise.all(
    items.map((i: any) =>
      FoodOrderItem.create({
        orderId: order.id,
        menuItemId: i.menuItemId,
        name: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
        total: i.unitPrice * i.quantity,
        notes: i.notes
      })
    )
  );

  // Confirma automaticamente e envia mensagem de pedido recebido
  await order.update({ status: "confirmed" });
  if (config.msgOrderConfirmed) {
    await sendWhatsAppStatusMessage(order, config.msgOrderConfirmed);
  }

  // Notifica painel do restaurante via socket
  const io = getIO();
  io.to(`food-company-${config.companyId}`).emit("food-order-update", {
    action: "new",
    order: { ...order.toJSON(), items }
  });

  return res.status(201).json({
    orderId: order.id,
    total: order.total,
    status: order.status,
    estimatedMinutes: config.estimatedDeliveryMinutes
  });
};

// ─── Link do motoboy — confirmar entrega sem login ───────────────────────────

// GET /api/food/delivery/:token
export const getDeliveryInfo = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.params;
  const order = await FoodOrder.findOne({
    where: { deliveryToken: token },
    include: [FoodOrderItem]
  });
  if (!order) throw new AppError("Pedido não encontrado", 404);
  if (order.status === "delivered") throw new AppError("Pedido já foi marcado como entregue", 400);

  return res.json({
    id: order.id,
    customerName: order.customerName,
    customerAddress: `${order.customerAddress}, ${order.customerAddressNumber} ${order.customerAddressComplement || ""}`.trim(),
    customerNeighborhood: order.customerNeighborhood,
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    items: order.items
  });
};

// POST /api/food/delivery/:token/confirm
export const confirmDelivery = async (req: Request, res: Response): Promise<Response> => {
  const { token } = req.params;
  const order = await FoodOrder.findOne({ where: { deliveryToken: token } });
  if (!order) throw new AppError("Pedido não encontrado", 404);
  if (order.status === "delivered") throw new AppError("Pedido já foi entregue", 400);

  await order.update({ status: "delivered", paymentStatus: "paid" });

  const config = await FoodRestaurantConfig.findOne({ where: { companyId: order.companyId } });
  if (config?.msgOrderDelivered) {
    await sendWhatsAppStatusMessage(order, config.msgOrderDelivered);
  }

  const io = getIO();
  io.to(`food-company-${order.companyId}`).emit("food-order-update", {
    action: "update",
    order: { id: order.id, status: "delivered" }
  });

  return res.json({ message: "Entrega confirmada com sucesso!" });
};
