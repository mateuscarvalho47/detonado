import type { PrismaClient } from '@/generated/prisma/client.js';
export class LibraryImportRepository {
  constructor(private readonly database: PrismaClient) {}
  findExisting(userId: string, igdbIds: number[]) {
    return this.database.libraryEntry.findMany({
      where: { userId, igdbId: { in: igdbIds } },
      select: { id: true, igdbId: true },
    });
  }
  async findOwned(userId: string, igdbId: number) {
    return this.database.libraryEntry.findUnique({
      where: { userId_igdbId: { userId, igdbId } },
      select: { id: true, igdbId: true },
    });
  }
}
