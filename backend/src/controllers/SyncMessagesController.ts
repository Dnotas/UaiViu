import { Request, Response } from "express";
import SyncMessagesService from "../services/WbotServices/SyncMessagesService";

export const checkSync = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { contactId, whatsappId } = req.params;

  try {
    const service = new SyncMessagesService();
    const result = await service.checkSync(
      parseInt(contactId),
      companyId,
      parseInt(whatsappId)
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const syncMessages = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { contactId, whatsappId } = req.params;
  const { limit } = req.body;

  try {
    const service = new SyncMessagesService();
    const result = await service.syncMessages(
      parseInt(contactId),
      companyId,
      parseInt(whatsappId),
      limit || 50
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const syncTicketMessages = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { ticketId } = req.params;
  const { limit } = req.body;

  try {
    const service = new SyncMessagesService();
    const result = await service.syncTicketMessages(
      parseInt(ticketId),
      companyId,
      limit || 50
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
