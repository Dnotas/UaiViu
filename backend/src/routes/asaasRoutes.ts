import { Router } from "express";
import isAuth from "../middleware/isAuth";
import tokenAuth from "../middleware/tokenAuth";
import * as AsaasController from "../controllers/AsaasController";

const routes = Router();

// CRUD (requires login)
routes.get("/asaas/configs", isAuth, AsaasController.listConfigs);
routes.post("/asaas/configs", isAuth, AsaasController.createConfig);
routes.put("/asaas/configs/:id", isAuth, AsaasController.updateConfig);
routes.delete("/asaas/configs/:id", isAuth, AsaasController.deleteConfig);

// External API (requires whatsapp token, same as messages API)
routes.post("/api/asaas/send-boleto", tokenAuth, AsaasController.sendBoleto);

export default routes;
