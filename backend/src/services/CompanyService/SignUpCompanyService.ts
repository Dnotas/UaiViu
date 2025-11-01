import * as Yup from "yup";
import { hash } from "bcryptjs";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";
import Setting from "../../models/Setting";
import ActivationToken from "../../models/ActivationToken";

interface SignUpData {
  activationToken: string;
  companyName: string;
  companyPhone: string;
  companyEmail: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

interface SignUpResponse {
  company: Company;
  user: User;
}

const SignUpCompanyService = async (
  data: SignUpData
): Promise<SignUpResponse> => {
  const {
    activationToken,
    companyName,
    companyPhone,
    companyEmail,
    adminName,
    adminEmail,
    adminPassword
  } = data;

  // Validação dos dados
  const schema = Yup.object().shape({
    activationToken: Yup.string().required("ERR_ACTIVATION_TOKEN_REQUIRED"),
    companyName: Yup.string()
      .min(2, "ERR_COMPANY_INVALID_NAME")
      .required("ERR_COMPANY_INVALID_NAME"),
    companyEmail: Yup.string()
      .email("ERR_INVALID_EMAIL")
      .required("ERR_EMAIL_REQUIRED"),
    adminName: Yup.string()
      .min(2, "ERR_ADMIN_INVALID_NAME")
      .required("ERR_ADMIN_NAME_REQUIRED"),
    adminEmail: Yup.string()
      .email("ERR_INVALID_EMAIL")
      .required("ERR_EMAIL_REQUIRED"),
    adminPassword: Yup.string()
      .min(6, "ERR_PASSWORD_TOO_SHORT")
      .required("ERR_PASSWORD_REQUIRED")
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Buscar e validar o token
  const token = await ActivationToken.findOne({
    where: {
      token: activationToken,
      status: "available"
    }
  });

  if (!token) {
    throw new AppError("ERR_INVALID_ACTIVATION_TOKEN", 401);
  }

  // Verificar se o token expirou
  if (token.expiresAt && new Date() > new Date(token.expiresAt)) {
    await token.update({ status: "expired" });
    throw new AppError("ERR_ACTIVATION_TOKEN_EXPIRED", 401);
  }

  // Verificar se já existe empresa com o mesmo nome
  const existingCompany = await Company.findOne({
    where: { name: companyName }
  });

  if (existingCompany) {
    throw new AppError("ERR_COMPANY_NAME_ALREADY_EXISTS", 400);
  }

  // Verificar se já existe usuário com o email
  const existingUser = await User.findOne({
    where: { email: adminEmail }
  });

  if (existingUser) {
    throw new AppError("ERR_USER_EMAIL_ALREADY_EXISTS", 400);
  }

  // Calcular data de vencimento (30 dias a partir de hoje)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Criar a empresa
  const company = await Company.create({
    name: companyName,
    phone: companyPhone,
    email: companyEmail,
    status: true,
    planId: token.planId,
    dueDate: dueDate.toISOString().split('T')[0],
    recurrence: "MENSAL"
  });

  // Criar usuário admin
  const passwordHash = await hash(adminPassword, 8);
  const user = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    passwordHash,
    profile: "admin",
    companyId: company.id
  });

  // Marcar token como usado
  await token.update({
    status: "used",
    usedAt: new Date()
  });

  // Criar todas as configurações padrão
  const defaultSettings = [
    { key: "asaas", value: "" },
    { key: "tokenixc", value: "" },
    { key: "ipixc", value: "" },
    { key: "ipmkauth", value: "" },
    { key: "clientsecretmkauth", value: "" },
    { key: "clientidmkauth", value: "" },
    { key: "CheckMsgIsGroup", value: "disabled" },
    { key: "call", value: "disabled" },
    { key: "scheduleType", value: "disabled" },
    { key: "sendGreetingAccepted", value: "disabled" },
    { key: "sendMsgTransfTicket", value: "disabled" },
    { key: "userRating", value: "disabled" },
    { key: "chatBotType", value: "text" },
    { key: "tokensgp", value: "" },
    { key: "ipsgp", value: "" },
    { key: "appsgp", value: "" },
    { key: "campaignsEnabled", value: "false" }
  ];

  for (const setting of defaultSettings) {
    await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: setting.key
      },
      defaults: {
        companyId: company.id,
        key: setting.key,
        value: setting.value
      }
    });
  }

  return { company, user };
};

export default SignUpCompanyService;
