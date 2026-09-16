import express from "express";
import * as WapiWebhookController from "../controllers/WapiWebhookController";

const wapiWebhookRoutes = express.Router();

// Sem isAuth: o W-API chama esse endpoint diretamente, sem token JWT do UaiViu.
wapiWebhookRoutes.post("/webhook/wapi-bridge", WapiWebhookController.receive);

export default wapiWebhookRoutes;
