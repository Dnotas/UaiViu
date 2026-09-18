import express from "express";
import isAuth from "../middleware/isAuth";

import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);

whatsappRoutes.post("/whatsapp/", isAuth, WhatsAppController.store);

whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);

whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);

whatsappRoutes.post(
  "/whatsapp/:whatsappId/pairing-code",
  isAuth,
  WhatsAppController.requestPairingCode
);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  WhatsAppController.remove
);

// QR code proxy para conexões via Evolution API
whatsappRoutes.get(
  "/whatsapp/:whatsappId/evolution-qr",
  isAuth,
  WhatsAppController.evolutionQr
);

export default whatsappRoutes;
