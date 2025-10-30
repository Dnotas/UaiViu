import { Router } from "express";
import * as ActivationTokenController from "../controllers/ActivationTokenController";
import isAuth from "../middleware/isAuth";

const activationTokenRoutes = Router();

// Todas as rotas requerem autenticação
activationTokenRoutes.get("/activation-tokens", isAuth, ActivationTokenController.index);
activationTokenRoutes.get("/activation-tokens/:tokenId", isAuth, ActivationTokenController.show);
activationTokenRoutes.post("/activation-tokens", isAuth, ActivationTokenController.store);
activationTokenRoutes.delete("/activation-tokens/:tokenId", isAuth, ActivationTokenController.remove);

export default activationTokenRoutes;
