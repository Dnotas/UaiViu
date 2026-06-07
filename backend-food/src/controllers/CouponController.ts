import { Request, Response } from "express";
import { Op } from "sequelize";
import FoodCoupon from "../models/FoodCoupon";
import FoodRestaurantConfig from "../models/FoodRestaurantConfig";
import AppError from "../errors/AppError";

// GET /api/food/coupons
export const list = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const coupons = await FoodCoupon.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
  });
  return res.json(coupons);
};

// POST /api/food/coupons
export const create = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { code, discountType, discountValue, minOrderValue, usageLimit, expiresAt } = req.body;

  if (!code || !discountType || !discountValue) {
    throw new AppError("Código, tipo e valor do desconto são obrigatórios", 400);
  }

  const existing = await FoodCoupon.findOne({
    where: { companyId, code: code.toUpperCase() },
  });
  if (existing) throw new AppError("Já existe um cupom com este código", 400);

  const coupon = await FoodCoupon.create({
    companyId,
    code: code.toUpperCase().trim(),
    discountType,
    discountValue: Number(discountValue),
    minOrderValue: minOrderValue ? Number(minOrderValue) : null,
    usageLimit: usageLimit ? Number(usageLimit) : null,
    expiresAt: expiresAt || null,
    active: true,
    usageCount: 0,
  });

  return res.status(201).json(coupon);
};

// PUT /api/food/coupons/:id
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const coupon = await FoodCoupon.findOne({ where: { id, companyId } });
  if (!coupon) throw new AppError("Cupom não encontrado", 404);

  const { code, discountType, discountValue, minOrderValue, usageLimit, expiresAt, active } = req.body;

  // Verifica duplicidade de código se for alterar
  if (code && code.toUpperCase() !== coupon.code) {
    const existing = await FoodCoupon.findOne({
      where: { companyId, code: code.toUpperCase(), id: { [Op.ne]: coupon.id } },
    });
    if (existing) throw new AppError("Já existe um cupom com este código", 400);
  }

  await coupon.update({
    ...(code !== undefined && { code: code.toUpperCase().trim() }),
    ...(discountType !== undefined && { discountType }),
    ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
    ...(minOrderValue !== undefined && { minOrderValue: minOrderValue ? Number(minOrderValue) : null }),
    ...(usageLimit !== undefined && { usageLimit: usageLimit ? Number(usageLimit) : null }),
    ...(expiresAt !== undefined && { expiresAt: expiresAt || null }),
    ...(active !== undefined && { active }),
  });

  return res.json(coupon);
};

// DELETE /api/food/coupons/:id
export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const coupon = await FoodCoupon.findOne({ where: { id, companyId } });
  if (!coupon) throw new AppError("Cupom não encontrado", 404);

  await coupon.destroy();
  return res.json({ message: "Cupom removido" });
};

// POST /api/food/public/:slug/coupons/validate  (público)
export const validatePublic = async (req: Request, res: Response): Promise<Response> => {
  const { slug } = req.params;
  const { code, orderValue } = req.body;

  if (!code) throw new AppError("Informe o código do cupom", 400);

  const config = await FoodRestaurantConfig.findOne({ where: { slug } });
  if (!config) throw new AppError("Restaurante não encontrado", 404);

  const coupon = await FoodCoupon.findOne({
    where: { companyId: config.companyId, code: code.toUpperCase().trim() },
  });

  if (!coupon) return res.status(200).json({ valid: false, message: "Cupom inválido ou não encontrado" });
  if (!coupon.active) return res.status(200).json({ valid: false, message: "Este cupom não está mais ativo" });

  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    return res.status(200).json({ valid: false, message: "Este cupom expirou" });
  }

  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return res.status(200).json({ valid: false, message: "Este cupom já atingiu o limite de usos" });
  }

  if (coupon.minOrderValue && orderValue < Number(coupon.minOrderValue)) {
    return res.status(200).json({
      valid: false,
      message: `Pedido mínimo de R$ ${Number(coupon.minOrderValue).toFixed(2)} para usar este cupom`,
    });
  }

  return res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue),
  });
};
