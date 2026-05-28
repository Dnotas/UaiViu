import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import FoodMenuGroup from "../models/FoodMenuGroup";
import FoodMenuItem from "../models/FoodMenuItem";
import AppError from "../errors/AppError";

// ─── GRUPOS ───────────────────────────────────────────────────────────────────

export const listGroups = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const groups = await FoodMenuGroup.findAll({
    where: { companyId },
    include: [{ model: FoodMenuItem, where: { active: true }, required: false }],
    order: [["sortOrder", "ASC"], [FoodMenuItem, "sortOrder", "ASC"]]
  });
  return res.json(groups);
};

export const createGroup = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, sortOrder } = req.body;
  if (!name) throw new AppError("Nome do grupo é obrigatório", 400);
  const group = await FoodMenuGroup.create({ companyId, name, sortOrder: sortOrder || 0 });
  return res.status(201).json(group);
};

export const updateGroup = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const group = await FoodMenuGroup.findOne({ where: { id, companyId } });
  if (!group) throw new AppError("Grupo não encontrado", 404);
  await group.update(req.body);
  return res.json(group);
};

export const deleteGroup = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const group = await FoodMenuGroup.findOne({ where: { id, companyId } });
  if (!group) throw new AppError("Grupo não encontrado", 404);
  await group.destroy();
  return res.json({ message: "Grupo removido" });
};

// ─── ITENS ────────────────────────────────────────────────────────────────────

export const listItems = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { groupId } = req.params;
  const items = await FoodMenuItem.findAll({
    where: { companyId, groupId },
    order: [["sortOrder", "ASC"]]
  });
  return res.json(items);
};

export const createItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { groupId } = req.params;
  const { name, description, price, sortOrder } = req.body;

  if (!name || !price) throw new AppError("Nome e preço são obrigatórios", 400);

  const group = await FoodMenuGroup.findOne({ where: { id: groupId, companyId } });
  if (!group) throw new AppError("Grupo não encontrado", 404);

  let imageUrl: string | null = null;
  if (req.file) {
    imageUrl = `/uploads/menu/${req.file.filename}`;
  }

  const item = await FoodMenuItem.create({
    companyId,
    groupId: Number(groupId),
    name,
    description,
    price: parseFloat(price),
    sortOrder: sortOrder || 0,
    imageUrl
  });

  return res.status(201).json(item);
};

export const updateItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const item = await FoodMenuItem.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("Item não encontrado", 404);

  if (req.file) {
    // Remove imagem antiga
    if (item.imageUrl) {
      const oldPath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    req.body.imageUrl = `/uploads/menu/${req.file.filename}`;
  }

  if (req.body.price) req.body.price = parseFloat(req.body.price);
  await item.update(req.body);
  return res.json(item);
};

export const deleteItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const item = await FoodMenuItem.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("Item não encontrado", 404);

  if (item.imageUrl) {
    const filePath = path.resolve(process.cwd(), item.imageUrl.replace(/^\//, ""));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await item.destroy();
  return res.json({ message: "Item removido" });
};
