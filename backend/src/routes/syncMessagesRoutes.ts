import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as SyncMessagesController from "../controllers/SyncMessagesController";

const syncMessagesRoutes = Router();

// Verificar sincronização (não modifica dados)
syncMessagesRoutes.get(
  "/sync/messages/check/:contactId/:whatsappId",
  isAuth,
  SyncMessagesController.checkSync
);

// Sincronizar mensagens por contato
syncMessagesRoutes.post(
  "/sync/messages/:contactId/:whatsappId",
  isAuth,
  SyncMessagesController.syncMessages
);

// Sincronizar mensagens por ticket
syncMessagesRoutes.post(
  "/sync/messages/ticket/:ticketId",
  isAuth,
  SyncMessagesController.syncTicketMessages
);

export default syncMessagesRoutes;
