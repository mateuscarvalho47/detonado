import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
export class CampaignRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}
  withUserLock<T>(userId: string, operation: (repository: CampaignRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new CampaignRepository(this.database, tx));
    });
  }
  findEntry(entryId: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id: entryId, userId } });
  }
  list(entryId: string, userId: string) {
    return this.db.campaign.findMany({
      where: { entryId, userId },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    });
  }
  archive(
    id: string,
    entryId: string,
    userId: string,
    snapshot: Prisma.CampaignUpdateManyMutationInput,
  ) {
    return this.db.campaign.updateMany({
      where: { id, entryId, userId, archivedAt: null },
      data: snapshot,
    });
  }
  create(entryId: string, userId: string, startedAt: Date) {
    return this.db.campaign.create({ data: { entryId, userId, startedAt } });
  }
  resetEntry(entryId: string, userId: string, campaignId: string, notes: string | null) {
    return this.db.libraryEntry.update({
      where: { id: entryId, userId },
      data: {
        activeCampaignId: campaignId,
        status: 'PLAYING',
        baseHours: 0,
        hoursPlayed: 0,
        rating: null,
        notes,
        completedAt: null,
        lastSessionAt: null,
        queuePosition: null,
      },
    });
  }
  resetChecklist(entryId: string, userId: string) {
    return this.db.checklistItem.updateMany({
      where: { entryId, userId },
      data: { completed: false },
    });
  }
}
