import type { PrismaClient } from '@/generated/prisma/client.js';
export class SteamRepository {
  constructor(private readonly database: PrismaClient) {}
  findExisting(userId: string, igdbIds: number[]) {
    return this.database.libraryEntry.findMany({
      where: { userId, igdbId: { in: igdbIds } },
      select: { igdbId: true },
    });
  }
}
