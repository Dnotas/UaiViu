import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as AIController from "../controllers/AIController";

const aiRoutes = Router();

aiRoutes.post("/ai/improve-text", isAuth, AIController.improveText);
aiRoutes.post("/ai/generate-reply", isAuth, AIController.generateReply);

export default aiRoutes;
