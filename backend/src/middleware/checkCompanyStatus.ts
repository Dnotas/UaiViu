import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import Company from "../models/Company";

const checkCompanyStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { companyId } = req.user;

  if (!companyId) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const company = await Company.findByPk(companyId);

  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  // Verificar se a empresa está ativa
  if (!company.status) {
    throw new AppError("ERR_COMPANY_SUSPENDED", 403);
  }

  // Verificar se a empresa está dentro do período de validade
  if (company.dueDate) {
    const dueDate = new Date(company.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today) {
      throw new AppError("ERR_COMPANY_EXPIRED", 403);
    }
  }

  return next();
};

export default checkCompanyStatus;
