import { QueryTypes } from "sequelize";
import * as _ from "lodash";
import sequelize from "../../database";

export interface DifficultyTrendPoint {
  month: string;
  label: string;
  totalTickets: number;
  ratedTickets: number;
  avgDifficulty: number;
  difficulty1: number;
  difficulty2: number;
  difficulty3: number;
  difficulty4: number;
  difficulty5: number;
}

export interface DifficultyTrendParams {
  date_from?: string;
  date_to?: string;
  days?: number;
}

export default async function DashboardDifficultyTrendService(
  companyId: string | number,
  params: DifficultyTrendParams
): Promise<DifficultyTrendPoint[]> {
  const replacements: any[] = [companyId];
  let dateFilter = "";

  if (_.has(params, "days") && params.days) {
    dateFilter += ` AND tt."finishedAt" >= (now() - '${parseInt(`${params.days}`.replace(/\D/g, ""), 10)} days'::interval)`;
  }

  if (_.has(params, "date_from") && params.date_from) {
    dateFilter += ` AND tt."finishedAt" >= ?`;
    replacements.push(`${params.date_from} 00:00:00`);
  }

  if (_.has(params, "date_to") && params.date_to) {
    dateFilter += ` AND tt."finishedAt" <= ?`;
    replacements.push(`${params.date_to} 23:59:59`);
  }

  const query = `
    SELECT
      TO_CHAR(tt."finishedAt", 'YYYY-MM') AS "month",
      TO_CHAR(tt."finishedAt", 'Mon/YY') AS "label",
      COUNT(DISTINCT t.id)::integer AS "totalTickets",
      COUNT(DISTINCT CASE WHEN t."difficultyLevel" IS NOT NULL THEN t.id END)::integer AS "ratedTickets",
      ROUND(COALESCE(AVG(t."difficultyLevel"::numeric), 0), 2)::float AS "avgDifficulty",
      COUNT(CASE WHEN t."difficultyLevel" = 1 THEN 1 END)::integer AS "difficulty1",
      COUNT(CASE WHEN t."difficultyLevel" = 2 THEN 1 END)::integer AS "difficulty2",
      COUNT(CASE WHEN t."difficultyLevel" = 3 THEN 1 END)::integer AS "difficulty3",
      COUNT(CASE WHEN t."difficultyLevel" = 4 THEN 1 END)::integer AS "difficulty4",
      COUNT(CASE WHEN t."difficultyLevel" = 5 THEN 1 END)::integer AS "difficulty5"
    FROM "TicketTraking" tt
    INNER JOIN "Tickets" t ON t.id = tt."ticketId"
    WHERE tt."companyId" = ?
      AND tt."finishedAt" IS NOT NULL
      ${dateFilter}
    GROUP BY 1, 2
    ORDER BY 1 ASC
    LIMIT 24
  `;

  const data = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });

  return data as DifficultyTrendPoint[];
}
