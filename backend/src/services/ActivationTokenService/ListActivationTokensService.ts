import ActivationToken from "../../models/ActivationToken";
import Plan from "../../models/Plan";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  status?: string;
}

interface Response {
  tokens: ActivationToken[];
  count: number;
  hasMore: boolean;
}

const ListActivationTokensService = async ({
  searchParam = "",
  pageNumber = "1",
  status
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const whereCondition: any = {};

  if (searchParam) {
    whereCondition.companyName = {
      $like: `%${searchParam}%`
    };
  }

  if (status) {
    whereCondition.status = status;
  }

  const { count, rows: tokens } = await ActivationToken.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
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

  const hasMore = count > offset + tokens.length;

  return {
    tokens,
    count,
    hasMore
  };
};

export default ListActivationTokensService;
