import { PROGRESS_STATUSES } from '@detonado/shared';
import type { Prisma } from '@/generated/prisma/client.js';
import type { LibraryStats } from './library.schema.js';

const progressStatuses = { in: [...PROGRESS_STATUSES] };

export async function readLibraryStats(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<LibraryStats> {
  const [
    totalGames,
    totalHoursAgg,
    statusGroups,
    ratingGroups,
    topGenres,
    topPlatforms,
    completedTimeline,
    archivedHours,
    archivedCompleted,
    activeCompleted,
  ] = await Promise.all([
    db.libraryEntry.count({ where: { userId } }),
    db.libraryEntry.aggregate({
      where: { userId },
      _sum: { hoursPlayed: true },
    }),
    db.libraryEntry.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    }),
    db.libraryEntry.groupBy({
      by: ['rating'],
      where: { userId, rating: { not: null }, status: progressStatuses },
      _count: { rating: true },
      orderBy: { rating: 'asc' },
    }),
    db.$queryRaw<Array<{ genre: string; count: bigint }>>`
          SELECT unnest(genres) AS genre, COUNT(*) AS count
          FROM "LibraryEntry"
          WHERE "userId" = ${userId}
          GROUP BY genre
          ORDER BY count DESC
          LIMIT 5
        `,
    db.$queryRaw<Array<{ platform: string; count: bigint }>>`
          SELECT COALESCE("userPlatform", platforms[1]) AS platform, COUNT(*) AS count
          FROM "LibraryEntry"
          WHERE "userId" = ${userId}
            AND COALESCE("userPlatform", platforms[1]) IS NOT NULL
          GROUP BY platform
          ORDER BY count DESC
          LIMIT 5
        `,
    db.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR(DATE_TRUNC('month', "completedAt"), 'YYYY-MM') AS month, COUNT(*) AS count
          FROM (
            SELECT "completedAt" FROM "LibraryEntry" WHERE "userId" = ${userId} AND status = 'COMPLETED'
            UNION ALL
            SELECT "completedAt" FROM "Campaign" WHERE "userId" = ${userId} AND "archivedAt" IS NOT NULL AND status = 'COMPLETED'
          ) AS completions
          WHERE "completedAt" IS NOT NULL AND "completedAt" >= NOW() - INTERVAL '12 months'
          GROUP BY month ORDER BY month ASC
        `,
    db.campaign.aggregate({
      where: { userId, archivedAt: { not: null } },
      _sum: { hoursPlayed: true },
    }),
    db.campaign.count({ where: { userId, archivedAt: { not: null }, status: 'COMPLETED' } }),
    db.libraryEntry.count({ where: { userId, status: 'COMPLETED' } }),
  ]);

  const countByStatus: LibraryStats['countByStatus'] = {
    WISHLIST: 0,
    BACKLOG: 0,
    PLAYING: 0,
    PAUSED: 0,
    COMPLETED: 0,
    DROPPED: 0,
  };
  for (const group of statusGroups) {
    countByStatus[group.status] = group._count.status;
  }

  return {
    totalGames,
    completedCampaigns: archivedCompleted + activeCompleted,
    totalHours:
      Math.round(
        (Number(totalHoursAgg._sum.hoursPlayed ?? 0) +
          Number(archivedHours._sum.hoursPlayed ?? 0)) *
          10,
      ) / 10,
    countByStatus,
    topGenres: topGenres.map((row) => ({ genre: row.genre, count: Number(row.count) })),
    topPlatforms: topPlatforms.map((row) => ({ platform: row.platform, count: Number(row.count) })),
    ratingDistribution: ratingGroups.flatMap((group) =>
      group.rating === null
        ? []
        : [
            {
              rating: group.rating,
              count: group._count.rating,
            },
          ],
    ),
    completedTimeline: completedTimeline.map((row) => ({
      month: row.month,
      count: Number(row.count),
    })),
  };
}
