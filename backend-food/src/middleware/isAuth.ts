import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../errors/AppError";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

// Usa o mesmo JWT_SECRET do UaiViu principal para aceitar o mesmo token
const isAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new AppError("ERR_SESSION_EXPIRED", 401);

  const [, token] = authHeader.split(" ");
  if (!token) throw new AppError("ERR_SESSION_EXPIRED", 401);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    req.user = { id: decoded.id, profile: decoded.profile, companyId: decoded.companyId };
    next();
  } catch {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }
};

export default isAuth;
