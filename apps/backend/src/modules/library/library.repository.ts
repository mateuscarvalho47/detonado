import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { UpdateLibraryEntryInput } from './library.schema.js';

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

  update(
    id: string,
    data: Omit<UpdateLibraryEntryInput, 'completedAt'> & { completedAt?: Date | null },
  ) {
    return this.db.libraryEntry.update({ where: { id }, data });
  }

  updateHltb(
    id: string,
    data: {
      hltbMain: number | null;
      hltbMainExtra: number | null;
      hltbCompletionist: number | null;
      hltbStatus: 'FOUND' | 'MISS' | 'FAILED';
    },
  ) {
    return this.db.libraryEntry.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.libraryEntry.delete({ where: { id } });
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
      this.db.libraryEntry.aggregate({ where: { userId }, _sum: { hoursPlayed: true } }),
      this.db.libraryEntry.groupBy({
        by: ['status'],
        where: { userId },
        _count: { status: true },
      }),
      this.db.libraryEntry.groupBy({
        by: ['rating'],
        where: { userId, rating: { not: null } },
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
