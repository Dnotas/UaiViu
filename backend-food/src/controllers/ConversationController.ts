import { Request, Response } from "express";
import { Op } from "sequelize";
import FoodConversation from "../models/FoodConversation";
import FoodMessage from "../models/FoodMessage";
import FoodWhatsapp from "../models/FoodWhatsapp";
import { getWbot } from "../libs/wbotFood";
import { getIO } from "../libs/socket";

export const listConversations = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const conversations = await FoodConversation.findAll({
      where: { companyId },
      order: [["lastMessageAt", "DESC"]],
    });
    return res.json(conversations);
  } catch (err) {
    console.error("[ConversationController] listConversations:", err);
    return res.status(500).json({ error: "Erro ao listar conversas" });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const id = parseInt(req.params.id, 10);

    const conversation = await FoodConversation.findOne({ where: { id, companyId } });
    if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

    const messages = await FoodMessage.findAll({
      where: { conversationId: id },
      order: [["timestamp", "ASC"]],
    });

    return res.json({ conversation, messages });
  } catch (err) {
    console.error("[ConversationController] getMessages:", err);
    return res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const id = parseInt(req.params.id, 10);
    const { body } = req.body;

    if (!body || !body.trim()) return res.status(400).json({ error: "Mensagem vazia" });

    const conversation = await FoodConversation.findOne({ where: { id, companyId } });
    if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

    // Busca whatsapps da empresa para tentar enviar
    const whatsapps = await FoodWhatsapp.findAll({ where: { companyId } });
    const tryIds: number[] = [];
    if (conversation.whatsappId) tryIds.push(conversation.whatsappId);
    for (const w of whatsapps) {
      if (!tryIds.includes(w.id)) tryIds.push(w.id);
    }

    let sent = false;
    for (const wbotId of tryIds) {
      try {
        const wbot = getWbot(wbotId);
        await wbot.sendMessage(conversation.customerJid, { text: body });
        sent = true;
        if (conversation.whatsappId !== wbotId) {
          await conversation.update({ whatsappId: wbotId });
        }
        break;
      } catch {
        // try next
      }
    }

    if (!sent) {
      return res.status(503).json({ error: "Nenhuma conexão WhatsApp disponível" });
    }

    const now = new Date();
    const message = await FoodMessage.create({
      conversationId: id,
      fromMe: true,
      body: body.trim(),
      timestamp: now,
    });

    await conversation.update({ lastMessage: body.trim(), lastMessageAt: now });

    const io = getIO();
    io.to(`food-company-${companyId}`).emit("food:conversation:message", {
      conversationId: id,
      message,
    });

    return res.json(message);
  } catch (err) {
    console.error("[ConversationController] sendMessage:", err);
    return res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).companyId;
    const id = parseInt(req.params.id, 10);

    const conversation = await FoodConversation.findOne({ where: { id, companyId } });
    if (!conversation) return res.status(404).json({ error: "Conversa não encontrada" });

    await conversation.update({ unreadCount: 0 });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao marcar como lida" });
  }
};
