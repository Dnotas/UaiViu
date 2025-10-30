import { Request, Response } from "express";
import SignUpCompanyService from "../services/CompanyService/SignUpCompanyService";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    activationToken,
    companyName,
    companyPhone,
    companyEmail,
    adminName,
    adminEmail,
    adminPassword
  } = req.body;

  const { company, user } = await SignUpCompanyService({
    activationToken,
    companyName,
    companyPhone,
    companyEmail,
    adminName,
    adminEmail,
    adminPassword
  });

  return res.status(201).json({
    company: {
      id: company.id,
      name: company.name,
      email: company.email,
      status: company.status
    },
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    message: "Company registered successfully. You can now login with your credentials."
  });
};
