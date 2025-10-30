import { Request, Response } from "express";
import CreateActivationTokenService from "../services/ActivationTokenService/CreateActivationTokenService";
import ListActivationTokensService from "../services/ActivationTokenService/ListActivationTokensService";
import ShowActivationTokenService from "../services/ActivationTokenService/ShowActivationTokenService";
import DeleteActivationTokenService from "../services/ActivationTokenService/DeleteActivationTokenService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, status } = req.query as {
    searchParam?: string;
    pageNumber?: string;
    status?: string;
  };

  const { tokens, count, hasMore } = await ListActivationTokensService({
    searchParam,
    pageNumber,
    status
  });

  return res.json({ tokens, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tokenId } = req.params;

  const token = await ShowActivationTokenService(tokenId);

  return res.status(200).json(token);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    companyName,
    planId,
    maxUsers,
    maxConnections,
    expiresInDays,
    notes
  } = req.body;

  const { id } = req.user;

  const token = await CreateActivationTokenService({
    companyName,
    planId,
    maxUsers,
    maxConnections,
    expiresInDays,
    createdBy: +id,
    notes
  });

  return res.status(201).json(token);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tokenId } = req.params;

  await DeleteActivationTokenService(tokenId);

  return res.status(200).json({ message: "Token deleted" });
};
