import type { HltbStatus } from '@detonado/shared';
import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import { compareQueuePosition } from './library.queue.js';
import type { LibraryEntryChanges } from './library.schema.js';
import { readLibraryStats } from './library.stats.js';

interface HltbSnapshotChanges {
  hltbMain?: number | null;
  hltbMainExtra?: number | null;
  hltbCompletionist?: number | null;
  hltbStatus: HltbStatus;
}

export class LibraryRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}

  async withUserLock<T>(userId: string, operation: (repository: LibraryRepository) => Promise<T>) {
    return this.database.$transaction(async (transaction) => {
      // Serialize queue membership, positions and status changes for this user.
      await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new LibraryRepository(this.database, transaction));
    });
  }

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

  async sessionMinutes(entryId: string, userId: string) {
    const result = await this.db.playSession.aggregate({
      where: { entryId, userId },
      _sum: { durationMinutes: true },
    });
    return result._sum.durationMinutes ?? 0;
  }

  async nextQueuePosition(userId: string) {
    const positions = await this.db.libraryEntry.aggregate({
      where: { userId, status: 'BACKLOG' },
      _max: { queuePosition: true },
    });
    return (positions._max.queuePosition ?? 0) + 1;
  }

  async moveInQueue(userId: string, id: string, direction: 'up' | 'down') {
    const rows = await this.db.libraryEntry.findMany({
      where: { userId, status: 'BACKLOG' },
      select: { id: true, queuePosition: true, createdAt: true },
    });
    const ordered = rows.sort(compareQueuePosition);
    const index = ordered.findIndex((entry) => entry.id === id);
    const neighborIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0) return null;
    const neighbor = ordered[neighborIndex];
    if (!neighbor) return this.findByIdAndUser(id, userId);

    const positions = ordered.map((entry) => entry.queuePosition);
    const needsNormalization =
      positions.includes(null) || new Set(positions).size !== positions.length;
    if (needsNormalization) {
      // Legacy rows can have missing or duplicate positions. Repair only on demand.
      for (const [position, entry] of ordered.entries()) {
        entry.queuePosition = position + 1;
        await this.db.libraryEntry.update({
          where: { id: entry.id, userId },
          data: { queuePosition: entry.queuePosition },
        });
      }
    }

    const current = ordered[index];
    await this.db.libraryEntry.update({
      where: { id, userId },
      data: { queuePosition: neighbor.queuePosition },
    });
    await this.db.libraryEntry.update({
      where: { id: neighbor.id, userId },
      data: { queuePosition: current.queuePosition },
    });
    return this.findByIdAndUser(id, userId);
  }

  async update(id: string, userId: string, changes: LibraryEntryChanges) {
    const [entry] = await this.db.libraryEntry.updateManyAndReturn({
      where: { id, userId },
      data: changes,
    });
    return entry ?? null;
  }

  async updateHltb(id: string, userId: string, changes: HltbSnapshotChanges) {
    const [entry] = await this.db.libraryEntry.updateManyAndReturn({
      where: { id, userId },
      data: changes,
    });
    return entry ?? null;
  }

  async delete(id: string, userId: string) {
    const result = await this.db.libraryEntry.deleteMany({ where: { id, userId } });
    return result.count;
  }

  getStats(userId: string) {
    return readLibraryStats(this.db, userId);
  }
}
