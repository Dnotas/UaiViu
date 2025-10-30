import { Router } from "express";
import * as ActivationTokenController from "../controllers/ActivationTokenController";
import isAuth from "../middleware/isAuth";

const activationTokenRoutes = Router();

// Todas as rotas requerem autenticação e serão verificadas no index.ts
activationTokenRoutes.get("/activation-tokens", ActivationTokenController.index);
activationTokenRoutes.get("/activation-tokens/:tokenId", ActivationTokenController.show);
activationTokenRoutes.post("/activation-tokens", ActivationTokenController.store);
activationTokenRoutes.delete("/activation-tokens/:tokenId", ActivationTokenController.remove);

export default activationTokenRoutes;
