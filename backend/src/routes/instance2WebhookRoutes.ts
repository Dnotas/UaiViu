import express from "express";
import Instance2WebhookController from "../controllers/Instance2WebhookController";

const instance2WebhookRoutes = express.Router();

// Sem isAuth — autenticação é feita por token no body
instance2WebhookRoutes.post(
  "/webhook/instance2",
  Instance2WebhookController.handle
);

export default instance2WebhookRoutes;
