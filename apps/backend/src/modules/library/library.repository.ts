import { PROGRESS_STATUSES } from '@detonado/shared';
import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import { compareQueuePosition, reorderIds } from './library.queue.js';
import type { UpdateLibraryEntryInput } from './library.schema.js';

const progressStatuses = { in: [...PROGRESS_STATUSES] };

export class LibraryRepository {
  constructor(private readonly db: PrismaClient) {}

  findAllByUser(userId: string) {
    return this.db.libraryEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByIdAndUser(id: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id, userId } });
  }

  findByUserAndIgdbId(userId: string, igdbId: number) {
    return this.db.libraryEntry.findUnique({ where: { userId_igdbId: { userId, igdbId } } });
  }

  create(data: Prisma.LibraryEntryCreateInput) {
    return this.db.libraryEntry.create({ data });
  }

  async nextQueuePosition(userId: string) {
    const agg = await this.db.libraryEntry.aggregate({
      where: { userId, status: 'BACKLOG' },
      _max: { queuePosition: true },
    });
    return (agg._max.queuePosition ?? 0) + 1;
  }

  async moveInQueue(userId: string, id: string, direction: 'up' | 'down') {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.libraryEntry.findMany({
        where: { userId, status: 'BACKLOG' },
        select: { id: true, queuePosition: true, createdAt: true },
      });
      const ordered = rows.slice().sort(compareQueuePosition);
      const next = reorderIds(
        ordered.map((row) => row.id),
        id,
        direction,
      );
      if (!next) return tx.libraryEntry.findFirst({ where: { id, userId } });
      for (let index = 0; index < next.length; index++) {
        const rowId = next[index];
        if (!rowId) continue;
        await tx.libraryEntry.update({
          where: { id: rowId },
          data: { queuePosition: index + 1 },
        });
      }
      return tx.libraryEntry.findFirst({ where: { id, userId } });
    });
  }

  async update(
    id: string,
    userId: string,
    data: Omit<UpdateLibraryEntryInput, 'completedAt'> & {
      completedAt?: Date | null;
      queuePosition?: number | null;
    },
  ) {
    const result = await this.db.libraryEntry.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return null;
    return this.db.libraryEntry.findFirst({ where: { id, userId } });
  }

  async updateHltb(
    id: string,
    userId: string,
    data: {
      hltbMain: number | null;
      hltbMainExtra: number | null;
      hltbCompletionist: number | null;
      hltbStatus: 'FOUND' | 'MISS' | 'FAILED';
    },
  ) {
    const result = await this.db.libraryEntry.updateMany({ where: { id, userId }, data });
    if (result.count === 0) return null;
    return this.db.libraryEntry.findFirst({ where: { id, userId } });
  }

  async delete(id: string, userId: string) {
    const result = await this.db.libraryEntry.deleteMany({ where: { id, userId } });
    return result.count;
  }

  async getStats(userId: string) {
    const [
      totalGames,
      totalHoursAgg,
      statusGroups,
      ratingGroups,
      topGenres,
      topPlatforms,
      completedTimeline,
    ] = await Promise.all([
      this.db.libraryEntry.count({ where: { userId } }),
      this.db.libraryEntry.aggregate({
        where: { userId, status: progressStatuses },
        _sum: { hoursPlayed: true },
      }),
      this.db.libraryEntry.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
      this.db.libraryEntry.groupBy({
        by: ['rating'],
        where: { userId, rating: { not: null }, status: progressStatuses },
        _count: { rating: true },
        orderBy: { rating: 'asc' },
      }),
      this.db.$queryRaw<Array<{ genre: string; count: bigint }>>`
          SELECT unnest(genres) AS genre, COUNT(*) AS count
          FROM "LibraryEntry"
          WHERE "userId" = ${userId}
          GROUP BY genre
          ORDER BY count DESC
          LIMIT 5
        `,
      this.db.$queryRaw<Array<{ platform: string; count: bigint }>>`
          SELECT COALESCE("userPlatform", platforms[1]) AS platform, COUNT(*) AS count
          FROM "LibraryEntry"
          WHERE "userId" = ${userId}
            AND COALESCE("userPlatform", platforms[1]) IS NOT NULL
          GROUP BY platform
          ORDER BY count DESC
          LIMIT 5
        `,
      this.db.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR(DATE_TRUNC('month', "completedAt"), 'YYYY-MM') AS month, COUNT(*) AS count
          FROM "LibraryEntry"
          WHERE "userId" = ${userId}
            AND "completedAt" IS NOT NULL
            AND "completedAt" >= NOW() - INTERVAL '12 months'
          GROUP BY month
          ORDER BY month ASC
        `,
    ]);

    return {
      totalGames,
      totalHoursAgg,
      statusGroups,
      ratingGroups,
      topGenres,
      topPlatforms,
      completedTimeline,
    };
  }
}
