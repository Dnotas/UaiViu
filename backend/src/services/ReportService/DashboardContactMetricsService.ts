import { QueryTypes } from "sequelize";
import * as _ from "lodash";
import sequelize from "../../database";

export interface ContactMetric {
  contactId: number;
  contactName: string;
  contactNumber: string;
  totalTickets: number;
  ratedTickets: number;
  avgDifficulty: number;
  avgResolutionMinutes: number;
  difficulty1: number;
  difficulty2: number;
  difficulty3: number;
  difficulty4: number;
  difficulty5: number;
}

export interface ContactMetricsParams {
  date_from?: string;
  date_to?: string;
  days?: number;
  minDifficulty?: number;
  maxDifficulty?: number;
}

export default async function DashboardContactMetricsService(
  companyId: string | number,
  params: ContactMetricsParams
): Promise<ContactMetric[]> {
  let dateFilter = "";
  const replacements: any[] = [companyId, companyId];

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

  let difficultyFilter = "";
  if (params.minDifficulty) {
    difficultyFilter += ` AND COALESCE(AVG(t."difficultyLevel"), 0) >= ${parseFloat(`${params.minDifficulty}`)}`;
  }
  if (params.maxDifficulty) {
    difficultyFilter += ` AND COALESCE(AVG(t."difficultyLevel"), 0) <= ${parseFloat(`${params.maxDifficulty}`)}`;
  }

  const query = `
    SELECT
      ct.id::integer AS "contactId",
      ct.name AS "contactName",
      ct.number AS "contactNumber",
      COUNT(DISTINCT t.id)::integer AS "totalTickets",
      COUNT(DISTINCT CASE WHEN t."difficultyLevel" IS NOT NULL THEN t.id END)::integer AS "ratedTickets",
      ROUND(COALESCE(AVG(t."difficultyLevel"::numeric), 0), 2)::float AS "avgDifficulty",
      ROUND(COALESCE(AVG(
        CASE WHEN tt."startedAt" IS NOT NULL AND tt."finishedAt" IS NOT NULL THEN
          (date_part('day', age(tt."finishedAt", tt."startedAt")) * 24 * 60) +
          (date_part('hour', age(tt."finishedAt", tt."startedAt")) * 60) +
          date_part('minutes', age(tt."finishedAt", tt."startedAt"))
        END
      ), 0), 2)::float AS "avgResolutionMinutes",
      COUNT(CASE WHEN t."difficultyLevel" = 1 THEN 1 END)::integer AS "difficulty1",
      COUNT(CASE WHEN t."difficultyLevel" = 2 THEN 1 END)::integer AS "difficulty2",
      COUNT(CASE WHEN t."difficultyLevel" = 3 THEN 1 END)::integer AS "difficulty3",
      COUNT(CASE WHEN t."difficultyLevel" = 4 THEN 1 END)::integer AS "difficulty4",
      COUNT(CASE WHEN t."difficultyLevel" = 5 THEN 1 END)::integer AS "difficulty5"
    FROM "Contacts" ct
    INNER JOIN "Tickets" t ON t."contactId" = ct.id AND t."companyId" = ? AND t.status = 'closed'
    LEFT JOIN "TicketTraking" tt ON tt."ticketId" = t.id AND tt."finishedAt" IS NOT NULL
    WHERE ct."companyId" = ?
    ${dateFilter}
    GROUP BY ct.id, ct.name, ct.number
    HAVING COUNT(DISTINCT t.id) > 0
    ${difficultyFilter}
    ORDER BY "totalTickets" DESC, "avgDifficulty" DESC
    LIMIT 100
  `;

  const data = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });

  return data as ContactMetric[];
}
