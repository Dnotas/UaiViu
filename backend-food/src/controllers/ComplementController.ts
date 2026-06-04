import { Request, Response } from "express";
import FoodItemComplement from "../models/FoodItemComplement";
import FoodMenuItem from "../models/FoodMenuItem";
import FoodMenuGroup from "../models/FoodMenuGroup";
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

// Aplica a mesma lista de complementos em TODOS os itens do grupo
export const saveGroupComplements = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { groupId } = req.params;
  const { complements } = req.body; // [{ name, price }]

  const group = await FoodMenuGroup.findOne({ where: { id: groupId, companyId } });
  if (!group) throw new AppError("Grupo não encontrado", 404);

  const items = await FoodMenuItem.findAll({ where: { groupId, companyId } });
  if (!items.length) return res.json({ updated: 0 });

  const hasComps = Array.isArray(complements) && complements.some(c => c.name?.trim());

  for (const item of items) {
    await item.update({ hasComplements: hasComps });
    await FoodItemComplement.destroy({ where: { menuItemId: item.id } });
    if (Array.isArray(complements)) {
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
  }

  return res.json({ updated: items.length });
};
