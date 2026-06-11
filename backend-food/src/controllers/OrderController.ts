import { Request, Response } from "express";
import { Op } from "sequelize";
import { v4 as uuidv4 } from "uuid";
import FoodOrder from "../models/FoodOrder";
import FoodOrderItem from "../models/FoodOrderItem";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import FoodWhatsapp from "../models/FoodWhatsapp";
import FoodConversation from "../models/FoodConversation";
import FoodMessage from "../models/FoodMessage";
import FoodMenuItem from "../models/FoodMenuItem";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";
import { getWbot } from "../libs/wbotFood";
import { getJidBySession } from "../services/wbot/FoodMessageHandler";
import FoodCustomer from "../models/FoodCustomer";
import FoodCoupon from "../models/FoodCoupon";
import sequelize from "../database";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Haversine — distância em km entre dois pontos geográficos */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const resolveJid = async (wbot: ReturnType<typeof getWbot>, rawPhone: string): Promise<string> => {
  let phone = rawPhone.replace(/\D/g, "");
  if (!phone.startsWith("55")) phone = `55${phone}`;

  try {
    const [result] = await (wbot as any).onWhatsApp(phone);
    if (result?.exists) {
      console.log(`[WA-Send] onWhatsApp resolveu: ${phone} → ${result.jid}`);
      return result.jid;
    }

    const altPhone = /^55\d{2}9\d{8}$/.test(phone)
      ? phone.replace(/^(55\d{2})9/, "$1")
      : phone.replace(/^(55\d{2})(\d{8})$/, "$19$2");

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
      targetJid = conversation.customerJid;
      console.log(`[WA-Send] Conversa encontrada via telefone, JID: ${targetJid}`);
    }
  }

  console.log(`[WA-Send] Pedido #${order.id} → JID: ${targetJid || "não resolvido"}, conversa: ${conversation?.id || "não encontrada"}`);

  for (const wbotId of tryIds) {
    try {
      const wbot = getWbot(wbotId);

      let jid = targetJid;
      if (!jid) {
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
  const { status, dateFrom, dateTo } = req.query as Record<string, string>;

  const where: any = { companyId };
  if (status) where.status = status;

  if (dateFrom || dateTo) {
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : new Date("2000-01-01");
    const to   = dateTo   ? new Date(dateTo   + "T23:59:59.999") : new Date();
    where.createdAt = { [Op.between]: [from, to] };
  }

  const orders = await FoodOrder.findAll({
    where,
    include: [FoodOrderItem],
    order: [["createdAt", "DESC"]]
  });

  return res.json(orders);
};

// DELETE /api/food/orders  ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
export const deleteByPeriod = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { dateFrom, dateTo } = req.query as Record<string, string>;

  if (!dateFrom || !dateTo) throw new AppError("Informe dateFrom e dateTo", 400);

  const from = new Date(dateFrom + "T00:00:00");
  const to   = new Date(dateTo   + "T23:59:59.999");

  const orders = await FoodOrder.findAll({
    where: { companyId, createdAt: { [Op.between]: [from, to] } },
    attributes: ["id"],
  });

  const ids = orders.map(o => o.id);
  if (ids.length === 0) return res.json({ deleted: 0 });

  await FoodOrderItem.destroy({ where: { orderId: { [Op.in]: ids } } });
  await FoodOrder.destroy({ where: { id: { [Op.in]: ids } } });

  return res.json({ deleted: ids.length });
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

  const updateData: any = { status };
  if (status === "cancelled" && req.body.reason) {
    updateData.cancelReason = req.body.reason;
  }
  await order.update(updateData);

  const config = await FoodRestaurantConfig.findOne({ where: { companyId } });
  if (config) {
    const msgMap: Record<string, string> = {
      confirmed: config.msgOrderConfirmed,
      preparing: config.msgOrderPreparing,
      on_the_way: config.msgOrderOnTheWay,
      delivered: config.msgOrderDelivered,
    };

    if (status === "cancelled") {
      const reason = req.body.reason?.trim();
      const cancelMsg = reason
        ? `❌ Seu pedido #${order.id} foi cancelado.\n\nMotivo: ${reason}\n\nPedimos desculpas pelo transtorno. Entre em contato se tiver dúvidas.`
        : `❌ Seu pedido #${order.id} foi cancelado.\n\nPedimos desculpas pelo transtorno.`;
      await sendWhatsAppStatusMessage(order, cancelMsg);
    } else if (msgMap[status]) {
      await sendWhatsAppStatusMessage(order, msgMap[status]);
    }
  }

  // Arquiva conversa (sem deletar) quando pedido é entregue
  if (status === "delivered" && order.customerJid) {
    const conv = await FoodConversation.findOne({
      where: { companyId, customerJid: order.customerJid }
    });
    if (conv) {
      await conv.update({ closedAt: new Date() });
      const io = getIO();
      io.to(`food-company-${companyId}`).emit("food:conversation:closed", { conversationId: conv.id });
    }
  }

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
    session,
    customerLat,
    customerLng,
    couponCode,
    idempotencyKey,
  } = req.body;

  if (!items || !items.length) throw new AppError("Carrinho vazio", 400);
  if (!paymentMethod) throw new AppError("Forma de pagamento é obrigatória", 400);
  if (!customerPhone) throw new AppError("Telefone é obrigatório", 400);

  // Bloqueia pedidos quando a loja está fechada
  if (config.storeStatus === "closed_silent" || config.storeStatus === "closed_notice") {
    throw new AppError("A loja está fechada no momento. Tente novamente mais tarde.", 403);
  }

  const normalizedPhone = customerPhone.replace(/\D/g, "");

  // ── [P2] Idempotency key — evita pedido duplicado por duplo clique ──────────
  if (idempotencyKey) {
    const existing = await FoodOrder.findOne({
      where: { companyId: config.companyId, idempotencyKey },
      include: [FoodOrderItem],
    });
    if (existing) {
      console.log(`[Order] Idempotência: pedido #${existing.id} já existe para chave ${idempotencyKey}`);
      return res.status(200).json({
        orderId: existing.id,
        total: existing.total,
        status: existing.status,
        estimatedMinutes: config.estimatedDeliveryMinutes,
      });
    }
  }

  // ── [P2] Rate limiting — máx 10 pedidos por telefone por hora ───────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await FoodOrder.count({
    where: {
      companyId: config.companyId,
      customerPhone: normalizedPhone,
      createdAt: { [Op.gte]: oneHourAgo },
    },
  });
  if (recentCount >= 10) {
    throw new AppError("Muitos pedidos realizados. Aguarde antes de fazer um novo pedido.", 429);
  }

  // ── [P1] Valida itens e busca preços reais no banco ─────────────────────────
  const menuItemIds: number[] = items.map((i: any) => Number(i.menuItemId));
  const dbItems = await FoodMenuItem.findAll({
    where: {
      id: { [Op.in]: menuItemIds },
      companyId: config.companyId,
      active: true,
    },
  });

  const dbItemMap = new Map<number, FoodMenuItem>(dbItems.map(i => [i.id, i]));

  for (const item of items) {
    const dbItem = dbItemMap.get(Number(item.menuItemId));
    if (!dbItem) {
      throw new AppError(`Item "${item.name}" não encontrado ou indisponível`, 400);
    }
    if (!dbItem.available) {
      throw new AppError(`Item "${dbItem.name}" está indisponível no momento`, 400);
    }
  }

  // Recalcula subtotal com preços do banco (ignora unitPrice do cliente)
  const validatedItems = items.map((i: any) => {
    const dbItem = dbItemMap.get(Number(i.menuItemId))!;
    return {
      menuItemId: dbItem.id,
      name: i.name, // nome com complementos (ex: "Pizza (mussarela, tomate)")
      unitPrice: Number(dbItem.price),
      quantity: Number(i.quantity) || 1,
      notes: i.notes || null,
    };
  });

  const subtotal: number = validatedItems.reduce(
    (sum: number, i: any) => sum + i.unitPrice * i.quantity,
    0
  );

  // ── [P1] Calcula taxa de entrega server-side ─────────────────────────────────
  let deliveryFee = 0;
  if (orderType === "delivery") {
    if (config.deliveryByDistance) {
      if (
        customerLat != null && customerLng != null &&
        config.restaurantLat && config.restaurantLng
      ) {
        const distKm = haversineKm(
          Number(customerLat), Number(customerLng),
          Number(config.restaurantLat), Number(config.restaurantLng)
        );
        const rates = [...(config.deliveryRates || [])].sort(
          (a, b) => a.maxKm - b.maxKm
        );
        const rate = rates.find(r => distKm <= Number(r.maxKm));
        if (!rate) {
          throw new AppError(`Endereço fora da área de entrega (${distKm.toFixed(1)} km)`, 400);
        }
        deliveryFee = Number(rate.fee);
        console.log(`[Order] Frete calculado server-side: ${distKm.toFixed(2)} km → R$ ${deliveryFee}`);
      } else {
        // Sem coordenadas: usa menor taxa disponível como fallback seguro
        const rates = [...(config.deliveryRates || [])].sort((a, b) => a.fee - b.fee);
        deliveryFee = rates.length > 0 ? Number(rates[0].fee) : Number(config.deliveryFee);
        console.warn(`[Order] Sem coordenadas do cliente — usando taxa de fallback: R$ ${deliveryFee}`);
      }
    } else {
      deliveryFee = Number(config.deliveryFee);
    }
  }

  // ── Resolve JID do cliente (assíncrono, agora que getJidBySession é async) ──
  let customerJid: string | null = null;
  let whatsappId: number | null = null;
  if (session) {
    const sessionData = await getJidBySession(session);
    if (sessionData) {
      customerJid = sessionData.jid;
      whatsappId = sessionData.whatsappId;
      console.log(`[Order] Sessão válida: JID=${customerJid}, whatsappId=${whatsappId}`);
    } else {
      console.warn(`[Order] Sessão '${session}' não encontrada — backend reiniciado ou expirou. Fallback para telefone.`);
    }
  }

  // ── [P1+P3] Transação de banco — garante consistência total ─────────────────
  let order!: FoodOrder;
  let discountAmount = 0;
  let appliedCouponCode: string | null = null;

  await sequelize.transaction(async (t) => {
    // ── [P1] Cupom com SELECT FOR UPDATE — sem race condition ─────────────────
    if (couponCode) {
      const coupon = await FoodCoupon.findOne({
        where: { companyId: config.companyId, code: couponCode.toUpperCase().trim() },
        lock: t.LOCK.UPDATE, // SELECT FOR UPDATE — bloqueia até o commit
        transaction: t,
      });

      if (coupon && coupon.active &&
          (!coupon.expiresAt || new Date() <= new Date(coupon.expiresAt)) &&
          (!coupon.minOrderValue || subtotal >= Number(coupon.minOrderValue))
      ) {
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
          throw new AppError("Cupom esgotado", 400);
        }

        if (coupon.discountType === "percent") {
          discountAmount = Math.min(subtotal * (Number(coupon.discountValue) / 100), subtotal);
        } else {
          discountAmount = Math.min(Number(coupon.discountValue), subtotal);
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
        appliedCouponCode = coupon.code;

        await coupon.increment("usageCount", { transaction: t });
      }
    }

    const total = subtotal + deliveryFee - discountAmount;

    order = await FoodOrder.create({
      companyId: config.companyId,
      customerName,
      customerPhone: normalizedPhone,
      customerAddress,
      customerAddressNumber,
      customerAddressComplement,
      customerNeighborhood,
      subtotal,
      deliveryFee,
      discountAmount,
      couponCode: appliedCouponCode,
      total,
      status: "confirmed",
      paymentMethod,
      paymentStatus: "pending",
      deliveryToken: uuidv4(),
      orderType: orderType || "delivery",
      notes,
      customerJid,
      whatsappId,
      idempotencyKey: idempotencyKey || null,
    }, { transaction: t });

    await Promise.all(
      validatedItems.map((i: any) =>
        FoodOrderItem.create({
          orderId: order.id,
          menuItemId: i.menuItemId,
          name: i.name,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          total: i.unitPrice * i.quantity,
          notes: i.notes,
        }, { transaction: t })
      )
    );

    // Salva/atualiza dados do cliente para auto-preenchimento futuro
    if (normalizedPhone) {
      try {
        await FoodCustomer.upsert({
          companyId: config.companyId,
          phone: normalizedPhone,
          customerName: customerName || undefined,
          cep: req.body.cep || undefined,
          customerAddress: customerAddress || undefined,
          customerAddressNumber: customerAddressNumber || undefined,
          customerAddressComplement: customerAddressComplement || undefined,
          customerNeighborhood: customerNeighborhood || undefined,
        }, { transaction: t } as any);
      } catch (e) {
        console.warn("[Order] Erro ao salvar dados do cliente:", e);
      }
    }
  });

  console.log(`[Order] Pedido #${order.id} criado e confirmado para empresa ${config.companyId}`);

  // ── Envia confirmação WhatsApp (fora da transação — efeito colateral) ────────
  if (config.msgOrderConfirmed) {
    const PAYMENT_LABEL: Record<string, string> = {
      cash: "Dinheiro na entrega", cash_money: "Dinheiro na entrega",
      cash_pix: "PIX na entrega", cash_card: "Cartão na entrega",
      pix: "PIX", credit: "Cartão de Crédito", debit: "Cartão de Débito",
    };
    const itemLines = validatedItems
      .map((i: any) => `  • ${i.quantity}x ${i.name} — R$ ${(i.unitPrice * i.quantity).toFixed(2).replace(".", ",")}`)
      .join("\n");
    const feeLine = deliveryFee > 0 ? `\n  • Taxa de entrega — R$ ${deliveryFee.toFixed(2).replace(".", ",")}` : "";
    const discountLine = discountAmount > 0
      ? `\n  • Desconto (${appliedCouponCode}) — -R$ ${discountAmount.toFixed(2).replace(".", ",")}`
      : "";
    const trocoLine = notes && notes.includes("Troco para")
      ? `\n💵 ${notes.match(/Troco para[^|]*/)?.[0]?.trim()}`
      : "";
    const total = subtotal + deliveryFee - discountAmount;
    const orderSummary =
      `\n\n📋 *Resumo do pedido #${order.id}:*\n${itemLines}${feeLine}${discountLine}` +
      `\n\n💰 *Total: R$ ${total.toFixed(2).replace(".", ",")}*` +
      `\n💳 Pagamento: ${PAYMENT_LABEL[paymentMethod] || paymentMethod}${trocoLine}`;
    await sendWhatsAppStatusMessage(order, config.msgOrderConfirmed + orderSummary);
  }

  const io = getIO();
  io.to(`food-company-${config.companyId}`).emit("food-order-update", {
    action: "new",
    order: { ...order.toJSON(), items: validatedItems }
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

  // ── [P3] Atômico — evita dupla confirmação em requests simultâneos ──────────
  const [affectedRows] = await FoodOrder.update(
    { status: "delivered", paymentStatus: "paid" },
    { where: { deliveryToken: token, status: { [Op.ne]: "delivered" } } }
  );

  if (affectedRows === 0) {
    // Ou o pedido não existe, ou já foi entregue — busca para distinguir
    const order = await FoodOrder.findOne({ where: { deliveryToken: token } });
    if (!order) throw new AppError("Pedido não encontrado", 404);
    throw new AppError("Pedido já foi marcado como entregue", 400);
  }

  const order = await FoodOrder.findOne({ where: { deliveryToken: token } });
  if (!order) throw new AppError("Pedido não encontrado", 404);

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
