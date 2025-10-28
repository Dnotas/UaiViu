import { Request, Response } from "express";
import ImproveTextService from "../services/AIService/ImproveTextService";

export const improveText = async (req: Request, res: Response): Promise<Response> => {
  const { text } = req.body;

  try {
    const improvedText = await ImproveTextService({ text });

    return res.status(200).json({ improvedText });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
