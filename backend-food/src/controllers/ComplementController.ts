import { Request, Response } from "express";
import FoodItemComplement from "../models/FoodItemComplement";
import FoodMenuItem from "../models/FoodMenuItem";
import AppError from "../errors/AppError";

export const listComplements = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { itemId } = req.params;

  const item = await FoodMenuItem.findOne({ where: { id: itemId, companyId } });
  if (!item) throw new AppError("Item não encontrado", 404);

  const complements = await FoodItemComplement.findAll({
    where: { menuItemId: itemId },
    order: [["sortOrder", "ASC"]],
  });
  return res.json(complements);
};

export const saveComplements = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { itemId } = req.params;
  // Body: { hasComplements: boolean, complements: [{ id?, name, price, sortOrder }] }
  const { hasComplements, complements } = req.body;

  const item = await FoodMenuItem.findOne({ where: { id: itemId, companyId } });
  if (!item) throw new AppError("Item não encontrado", 404);

  await item.update({ hasComplements: !!hasComplements });

  if (Array.isArray(complements)) {
    // Remove all existing and recreate (simple upsert)
    await FoodItemComplement.destroy({ where: { menuItemId: item.id } });
    for (let i = 0; i < complements.length; i++) {
      const c = complements[i];
      if (c.name && c.name.trim()) {
        await FoodItemComplement.create({
          menuItemId: item.id,
          name: c.name.trim(),
          price: parseFloat(c.price) || 0,
          sortOrder: i,
          active: true,
        });
      }
    }
  }

  const updated = await FoodMenuItem.findOne({
    where: { id: item.id },
    include: [FoodItemComplement],
  });
  return res.json(updated);
};
