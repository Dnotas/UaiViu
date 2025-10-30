import AppError from "../../errors/AppError";
import ActivationToken from "../../models/ActivationToken";

const DeleteActivationTokenService = async (id: string | number): Promise<void> => {
  const token = await ActivationToken.findOne({
    where: { id }
  });

  if (!token) {
    throw new AppError("ERR_NO_TOKEN_FOUND", 404);
  }

  // Não permitir deletar tokens que já foram usados
  if (token.status === "used") {
    throw new AppError("ERR_CANNOT_DELETE_USED_TOKEN", 400);
  }

  await token.destroy();
};

export default DeleteActivationTokenService;
