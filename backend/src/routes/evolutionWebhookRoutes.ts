import express from "express";
import EvolutionWebhookController from "../controllers/EvolutionWebhookController";

const evolutionWebhookRoutes = express.Router();

// Sem isAuth — autenticação é feita por apikey no body
evolutionWebhookRoutes.post(
  "/webhook/evolution",
  EvolutionWebhookController.handle
);

export default evolutionWebhookRoutes;
