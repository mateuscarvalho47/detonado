import {
  type RetrospectivePeriod,
  retrospectivePointSchema,
  retrospectiveSummarySchema,
} from '@detonado/shared';
import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client.js';
import { LIBRARY_TIME_ZONE } from './library.dates.js';

const resultSchema = retrospectiveSummarySchema.extend({
  series: z.array(retrospectivePointSchema),
});

export async function readPeriodStats(
  db: Prisma.TransactionClient,
  userId: string,
  period: RetrospectivePeriod,
) {
  const format = period.month === null ? 'YYYY-MM' : 'YYYY-MM-DD';
  // Prisma DateTime columns are UTC timestamps without a timezone. Boundaries
  // convert local calendar midnight to that UTC representation, including old DST.
  // completedAt is a calendar date stored at UTC midnight and must not shift days.
  const rows: unknown = await db.$queryRaw`
 WITH period_sessions AS (
  SELECT "entryId", "durationMinutes", "playedAt" FROM "PlaySession"
  WHERE "userId" = ${userId}
   AND "playedAt" >= ((${period.startDate}::timestamp AT TIME ZONE ${LIBRARY_TIME_ZONE}) AT TIME ZONE 'UTC')
   AND "playedAt" < ((${period.endDateExclusive}::timestamp AT TIME ZONE ${LIBRARY_TIME_ZONE}) AT TIME ZONE 'UTC')
 ), completions AS (
  SELECT id AS "entryId", "completedAt" FROM "LibraryEntry"
  WHERE "userId" = ${userId} AND status = 'COMPLETED'
   AND "completedAt" >= ${period.startDate}::timestamp AND "completedAt" < ${period.endDateExclusive}::timestamp
  UNION ALL
  SELECT "entryId", "completedAt" FROM "Campaign"
  WHERE "userId" = ${userId} AND "archivedAt" IS NOT NULL AND status = 'COMPLETED'
   AND "completedAt" >= ${period.startDate}::timestamp AND "completedAt" < ${period.endDateExclusive}::timestamp
 ), events AS (
  SELECT TO_CHAR("playedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${LIBRARY_TIME_ZONE}, ${format}) AS date,
   COUNT(*)::int AS sessions, SUM("durationMinutes")::int AS minutes, 0 AS "completedCampaigns"
  FROM period_sessions GROUP BY date
  UNION ALL
  SELECT TO_CHAR("completedAt", ${format}) AS date, 0 AS sessions, 0 AS minutes, COUNT(*)::int AS "completedCampaigns"
  FROM completions GROUP BY date
 ), points AS (
  SELECT date, SUM(sessions)::int AS sessions, SUM(minutes)::int AS minutes, SUM("completedCampaigns")::int AS "completedCampaigns"
  FROM events GROUP BY date
 )
 SELECT (SELECT COUNT(*)::int FROM period_sessions) AS sessions,
  (SELECT COALESCE(SUM("durationMinutes"),0)::int FROM period_sessions) AS minutes,
  (SELECT COUNT(DISTINCT "entryId")::int FROM period_sessions) AS "playedGames",
  (SELECT COUNT(*)::int FROM completions) AS "completedCampaigns",
  COALESCE((SELECT json_agg(points ORDER BY date) FROM points), '[]'::json) AS series
 `;
  return z.array(resultSchema).length(1).parse(rows)[0];
}
