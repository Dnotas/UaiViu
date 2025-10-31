import { Request, Response } from "express";
import ImproveTextService from "../services/AIService/ImproveTextService";
import GenerateReplyService from "../services/AIService/GenerateReplyService";
import TranscribeAudioService from "../services/AIService/TranscribeAudioService";
import TranscribeAndImproveService from "../services/AIService/TranscribeAndImproveService";

export const improveText = async (req: Request, res: Response): Promise<Response> => {
  const { text } = req.body;

  try {
    const improvedText = await ImproveTextService({ text });

    return res.status(200).json({ improvedText });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const generateReply = async (req: Request, res: Response): Promise<Response> => {
  const { targetMessage, contextMessages, contactName } = req.body;

  try {
    const generatedReply = await GenerateReplyService({
      targetMessage,
      contextMessages,
      contactName
    });

    return res.status(200).json({ generatedReply });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const transcribeAudio = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;

  try {
    const transcription = await TranscribeAudioService({ messageId });

    return res.status(200).json({ transcription });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};

export const transcribeAndImprove = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Verifica se há arquivo de áudio
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo de áudio foi enviado" });
    }

    const audioBuffer = req.file.buffer;
    const audioFileName = req.file.originalname;

    const improvedText = await TranscribeAndImproveService({
      audioBuffer,
      audioFileName
    });

    return res.status(200).json({ improvedText });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
};
