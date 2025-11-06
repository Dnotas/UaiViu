import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import ShowService from "./ShowService";

interface ScheduleData {
  id?: number;
  body?: string;
  sendAt?: string;
  sentAt?: string;
  contactId?: number;
  companyId?: number;
  ticketId?: number;
  userId?: number;
  isRecurring?: boolean;
  recurringType?: string;
  recurringTime?: string;
  isActive?: boolean;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
}

const UpdateUserService = async ({
  scheduleData,
  id,
  companyId
}: Request): Promise<Schedule | undefined> => {
  const schedule = await ShowService(id, companyId);

  if (schedule?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  const schema = Yup.object().shape({
    body: Yup.string().min(5),
    recurringTime: Yup.string().when('isRecurring', {
      is: true,
      then: Yup.string().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:mm'),
      otherwise: Yup.string().notRequired()
    })
  });

  const {
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
    isRecurring,
    recurringType,
    recurringTime,
    isActive
  } = scheduleData;

  try {
    await schema.validate({ body, isRecurring, recurringTime });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await schedule.update({
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
    isRecurring,
    recurringType,
    recurringTime,
    isActive
  });

  await schedule.reload();
  return schedule;
};

export default UpdateUserService;
