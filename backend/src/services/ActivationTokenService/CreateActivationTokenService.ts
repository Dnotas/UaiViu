import * as Yup from "yup";
import crypto from "crypto";
import AppError from "../../errors/AppError";
import ActivationToken from "../../models/ActivationToken";
import Plan from "../../models/Plan";

interface Request {
  companyName: string;
  planId: number;
  maxUsers: number;
  maxConnections: number;
  expiresInDays?: number;
  createdBy: number;
  notes?: string;
}

const CreateActivationTokenService = async (
  data: Request
): Promise<ActivationToken> => {
  const {
    companyName,
    planId,
    maxUsers,
    maxConnections,
    expiresInDays,
    createdBy,
    notes
  } = data;

  const schema = Yup.object().shape({
    companyName: Yup.string().required("ERR_COMPANY_NAME_REQUIRED"),
    planId: Yup.number().required("ERR_PLAN_ID_REQUIRED"),
    maxUsers: Yup.number().min(1).required("ERR_MAX_USERS_REQUIRED"),
    maxConnections: Yup.number().min(1).required("ERR_MAX_CONNECTIONS_REQUIRED")
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Verificar se o plano existe
  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("ERR_PLAN_NOT_FOUND", 404);
  }

  // Gerar token único
  const token = crypto.randomBytes(16).toString("hex");

  // Calcular data de expiração se fornecida
  let expiresAt = null;
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  const activationToken = await ActivationToken.create({
    token,
    companyName,
    planId,
    maxUsers,
    maxConnections,
    expiresAt,
    status: "available",
    createdBy,
    notes
  });

  return activationToken;
};

export default CreateActivationTokenService;
