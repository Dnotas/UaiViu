import AppError from "../../errors/AppError";
import ActivationToken from "../../models/ActivationToken";
import Plan from "../../models/Plan";
import User from "../../models/User";

const ShowActivationTokenService = async (
  id: string | number
): Promise<ActivationToken> => {
  const token = await ActivationToken.findByPk(id, {
    include: [
      {
        model: Plan,
        as: "plan",
        attributes: ["id", "name"]
      },
      {
        model: User,
        as: "creator",
        attributes: ["id", "name"]
      }
    ]
  });

  if (!token) {
    throw new AppError("ERR_NO_TOKEN_FOUND", 404);
  }

  return token;
};

export default ShowActivationTokenService;
