import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import FoodOrder from "../models/FoodOrder";
import FoodOrderItem from "../models/FoodOrderItem";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import FoodWhatsapp from "../models/FoodWhatsapp";
import FoodConversation from "../models/FoodConversation";
import FoodMessage from "../models/FoodMessage";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import { getWbot } from "../libs/wbotFood";
import { getJidBySession } from "../services/wbot/FoodMessageHandler";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const resolveJid = async (wbot: ReturnType<typeof getWbot>, rawPhone: string): Promise<string> => {
  let phone = rawPhone.replace(/\D/g, "");
  if (!phone.startsWith("55")) phone = `55${phone}`;

  try {
    // Verifica o número no WhatsApp e obtém o JID real (resolve o problema do 9 extra no Brasil)
    const [result] = await (wbot as any).onWhatsApp(phone);
    if (result?.exists) {
      console.log(`[WA-Send] onWhatsApp resolveu: ${phone} → ${result.jid}`);
      return result.jid;
    }

    // Tenta com/sem o nono dígito (DDDs que ainda não migraram)
    const altPhone = /^55\d{2}9\d{8}$/.test(phone)
      ? phone.replace(/^(55\d{2})9/, "$1")   // remove o 9 extra
      : phone.replace(/^(55\d{2})(\d{8})$/, "$19$2"); // adiciona o 9

    const [altResult] = await (wbot as any).onWhatsApp(altPhone);
    if (altResult?.exists) {
      console.log(`[WA-Send] onWhatsApp (alt) resolveu: ${phone} → ${altResult.jid}`);
      return altResult.jid;
    }
  } catch (err: any) {
    console.warn(`[WA-Send] onWhatsApp falhou (${err?.message}), usando JID direto`);
  }

  return `${phone}@s.whatsapp.net`;
};

const sendWhatsAppStatusMessage = async (order: FoodOrder, message: string) => {
  const whatsapps = await FoodWhatsapp.findAll({ where: { companyId: order.companyId } });
  const tryIds: number[] = [];
  if (order.whatsappId) tryIds.push(order.whatsappId);
  for (const w of whatsapps) {
    if (!tryIds.includes(w.id)) tryIds.push(w.id);
  }

  if (tryIds.length === 0) {
    console.error(`[WA-Send] ❌ Pedido #${order.id}: nenhum whatsapp encontrado`);
    return;
  }

  // Busca a conversa primeiro para garantir o JID correto (evita JID errado via onWhatsApp)
  let conversation: FoodConversation | null = null;
  let targetJid: string | null = order.customerJid || null;

  if (targetJid) {
    conversation = await FoodConversation.findOne({
      where: { companyId: order.companyId, customerJid: targetJid }
    });
  }

  if (!conversation && order.customerPhone) {
    const phone = order.customerPhone.replace(/\D/g, "").replace(/^55/, "");
    conversation = await FoodConversation.findOne({
      where: { companyId: order.companyId, customerPhone: phone }
    });
    if (conversation) {
      targetJid = conversation.customerJid; // Usa sempre o JID salvo na conversa
      console.log(`[WA-Send] Conversa encontrada via telefone, JID: ${targetJid}`);
    }
  }

  console.log(`[WA-Send] Pedido #${order.id} → JID: ${targetJid || "não resolvido"}, conversa: ${conversation?.id || "não encontrada"}`);

  for (const wbotId of tryIds) {
    try {
      const wbot = getWbot(wbotId);

      let jid = targetJid;
      if (!jid) {
        // Último recurso: resolve via onWhatsApp (pode ter variação do 9)
        jid = await resolveJid(wbot, order.customerPhone);
        console.log(`[WA-Send] JID resolvido via onWhatsApp: ${jid}`);
      }

      await wbot.sendMessage(jid, { text: message });
      console.log(`[WA-Send] ✅ Pedido #${order.id} → mensagem enviada via whatsapp ${wbotId}`);

      if (conversation) {
        try {
          const now = new Date();
          const saved = await FoodMessage.create({
            conversationId: conversation.id,
            fromMe: true,
            body: message,
            timestamp: now,
          });
          await conversation.update({ lastMessage: message, lastMessageAt: now });
          try {
            const io = getIO();
            io.to(`food-company-${order.companyId}`).emit("food:conversation:message", {
              conversationId: conversation.id,
              message: saved,
            });
          } catch { }
        } catch (e) {
          console.warn("[WA-Send] Erro ao salvar mensagem na conversa:", e);
        }
      }

      return;
    } catch (err: any) {
      console.error(`[WA-Send] ❌ Pedido #${order.id} → falha via whatsapp ${wbotId}: ${err?.message}`);
    }
  }

  console.error(`[WA-Send] ❌ Pedido #${order.id} → todos os whatsapps falharam`);
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
      console.log(`[Order] Status do pedido #${order.id} → '${status}', enviando mensagem WhatsApp`);
      await sendWhatsAppStatusMessage(order, msgMap[status]);
    } else {
      console.warn(`[Order] Mensagem para status '${status}' não configurada para empresa ${companyId}`);
    }
  } else {
    console.warn(`[Order] Config não encontrada para empresa ${companyId}, mensagem WhatsApp não enviada`);
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
    items,
    session
  } = req.body;

  if (!items || !items.length) throw new AppError("Carrinho vazio", 400);
  if (!paymentMethod) throw new AppError("Forma de pagamento é obrigatória", 400);
  if (!customerPhone) throw new AppError("Telefone é obrigatório", 400);

  // Calcula subtotal
  const subtotal: number = items.reduce((sum: number, i: any) => sum + (i.unitPrice * i.quantity), 0);
  const deliveryFee = orderType === "delivery" ? Number(config.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  // Resolve JID do cliente a partir da sessão (se veio pelo link do WhatsApp)
  let customerJid: string | null = null;
  let whatsappId: number | null = null;
  if (session) {
    const sessionData = getJidBySession(session);
    if (sessionData) {
      customerJid = sessionData.jid;
      whatsappId = sessionData.whatsappId;
      console.log(`[Order] Sessão válida: JID=${customerJid}, whatsappId=${whatsappId}`);
    } else {
      console.warn(`[Order] Sessão '${session}' não encontrada — backend pode ter reiniciado. Fallback para telefone.`);
    }
  } else {
    console.warn(`[Order] Pedido sem session token — sem JID salvo, usará telefone para envio.`);
  }

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
    notes,
    customerJid,
    whatsappId
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
  console.log(`[Order] Pedido #${order.id} criado e confirmado para empresa ${config.companyId}`);
  if (config.msgOrderConfirmed) {
    await sendWhatsAppStatusMessage(order, config.msgOrderConfirmed);
  } else {
    console.warn(`[Order] msgOrderConfirmed não configurado — mensagem de confirmação não enviada`);
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
