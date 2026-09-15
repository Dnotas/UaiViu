import { requestPairingCode } from "../../libs/wbot";
import { StartWhatsAppSession } from "./StartWhatsAppSession";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

const RequestPairingCodeService = async (
  whatsappId: number,
  companyId: number,
  phoneNumber: string
): Promise<string> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId, companyId }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  // Garante que uma sessão está sendo iniciada (idempotente: StartWhatsAppSession
  // já ignora chamadas concorrentes se já houver uma em andamento).
  StartWhatsAppSession(whatsapp, companyId);

  const code = await requestPairingCode(whatsapp.id, phoneNumber);
  return code;
};

export default RequestPairingCodeService;
