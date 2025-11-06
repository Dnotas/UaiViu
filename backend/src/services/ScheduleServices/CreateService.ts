import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  isRecurring?: boolean;
  recurringType?: string;
  recurringTime?: string;
  isActive?: boolean;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  isRecurring = false,
  recurringType,
  recurringTime,
  isActive = true
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().when('isRecurring', {
      is: false,
      then: Yup.string().required(),
      otherwise: Yup.string().notRequired()
    }),
    recurringTime: Yup.string().when('isRecurring', {
      is: true,
      then: Yup.string().required().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato deve ser HH:mm'),
      otherwise: Yup.string().notRequired()
    })
  });

  try {
    await schema.validate({ body, sendAt, isRecurring, recurringTime });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await Schedule.create(
    {
      body,
      sendAt: isRecurring ? null : sendAt,
      contactId,
      companyId,
      userId,
      status: isRecurring ? 'ATIVO' : 'PENDENTE',
      isRecurring,
      recurringType: isRecurring ? (recurringType || 'daily') : null,
      recurringTime: isRecurring ? recurringTime : null,
      isActive
    }
  );

  await schedule.reload();

  return schedule;
};

export default CreateService;
