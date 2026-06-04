import { Request, Response } from "express";
import fs from "fs";
import axios from "axios";
import FoodMenuItem from "../models/FoodMenuItem";
import FoodMenuGroup from "../models/FoodMenuGroup";
import AppError from "../errors/AppError";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_VISION_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

/**
 * POST /api/food/menu/ai-import
 * Accepts: multipart/form-data with files[] (images or PDF)
 * Returns: extracted items array for confirmation
 */
export const analyzeMenu = async (req: Request, res: Response): Promise<Response> => {
  if (!GEMINI_API_KEY) throw new AppError("GEMINI_API_KEY não configurada no servidor", 500);

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) throw new AppError("Nenhum arquivo enviado", 400);

  try {
    // Build parts: one text prompt + one inline_data per file
    const parts: any[] = [
      {
        text: `Analise as imagens/documentos do cardápio e extraia todos os produtos.
Para cada produto retorne um JSON array com os campos:
- name: nome do produto (string)
- description: descrição curta se houver (string ou "")
- price: preço em reais como número decimal (ex: 12.90). Se não houver preço, use 0.
- suggestedGroup: nome do grupo/categoria sugerido (ex: "Açaís", "Bebidas", "Lanches")

Retorne SOMENTE o JSON array, sem markdown, sem explicações, apenas o JSON puro.
Exemplo: [{"name":"Açaí 300ml","description":"","price":14.90,"suggestedGroup":"Açaís"}]`,
      },
    ];

    for (const file of files) {
      const data = fs.readFileSync(file.path);
      const base64 = data.toString("base64");
      parts.push({
        inline_data: {
          mime_type: file.mimetype,
          data: base64,
        },
      });
      // Cleanup temp file
      fs.unlinkSync(file.path);
    }

    const response = await axios.post(
      `${GEMINI_VISION_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
        },
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      }
    );

    const rawText: string =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to parse JSON from the response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("[AIImport] Gemini response:", rawText);
      throw new AppError("Não foi possível extrair produtos da imagem", 500);
    }

    const items = JSON.parse(jsonMatch[0]);
    return res.json({ items });
  } catch (err: any) {
    // Cleanup any remaining temp files
    const files2 = req.files as Express.Multer.File[];
    for (const f of files2 || []) {
      try { fs.unlinkSync(f.path); } catch { }
    }
    if (err instanceof AppError) throw err;
    console.error("[AIImport] Erro:", err?.response?.data || err.message);
    throw new AppError("Erro ao processar imagem com IA: " + (err.message || ""), 500);
  }
};

/**
 * POST /api/food/menu/ai-import/save
 * Body: { items: [{ name, description, price, groupId?, groupName? }] }
 * Creates groups (if new) and items in bulk
 */
export const saveImportedItems = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Nenhum item para salvar", 400);
  }

  const groupCache: Record<string, number> = {};

  // Pre-load existing groups for this company
  const existingGroups = await FoodMenuGroup.findAll({ where: { companyId } });
  for (const g of existingGroups) {
    groupCache[g.name.toLowerCase().trim()] = g.id;
  }

  const created: any[] = [];

  for (const item of items) {
    if (!item.name || !item.name.trim()) continue;

    let groupId: number | null = item.groupId || null;

    // If no groupId but groupName provided, find or create
    if (!groupId && item.groupName && item.groupName.trim()) {
      const key = item.groupName.trim().toLowerCase();
      if (groupCache[key]) {
        groupId = groupCache[key];
      } else {
        const newGroup = await FoodMenuGroup.create({
          companyId,
          name: item.groupName.trim(),
          sortOrder: 0,
        });
        groupId = newGroup.id;
        groupCache[key] = newGroup.id;
      }
    }

    if (!groupId) continue; // skip items without a group

    const newItem = await FoodMenuItem.create({
      companyId,
      groupId,
      name: item.name.trim(),
      description: item.description?.trim() || "",
      price: parseFloat(item.price) || 0,
      sortOrder: 0,
      active: true,
    });
    created.push(newItem);
  }

  return res.status(201).json({ created: created.length, items: created });
};
