import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";

import * as AIController from "../controllers/AIController";

const aiRoutes = Router();

// Configuração multer para armazenar arquivo em memória (sem salvar no disco)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB para áudios
  }
});

aiRoutes.post("/ai/improve-text", isAuth, AIController.improveText);
aiRoutes.post("/ai/generate-reply", isAuth, AIController.generateReply);
aiRoutes.post("/ai/transcribe/:messageId", isAuth, AIController.transcribeAudio);
aiRoutes.post("/ai/transcribe-and-improve", isAuth, uploadMemory.single("audio"), AIController.transcribeAndImprove);

export default aiRoutes;
