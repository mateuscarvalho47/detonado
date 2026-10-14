import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { CreateJournalEntryInput, UpdateJournalEntryInput } from './journal-entry.schema.js';
export class JournalEntryRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}
  withUserLock<T>(userId: string, operation: (repository: JournalEntryRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new JournalEntryRepository(this.database, tx));
    });
  }
  findEntry(entryId: string, userId: string) {
    return this.db.libraryEntry.findFirst({
      where: { id: entryId, userId },
      select: { id: true, activeCampaignId: true },
    });
  }
  findCampaign(id: string, entryId: string, userId: string) {
    return this.db.campaign.findFirst({ where: { id, entryId, userId }, select: { id: true } });
  }
  list(entryId: string, userId: string, campaignId?: string) {
    return this.db.journalEntry.findMany({
      where: { entryId, userId, campaignId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
  }
  create(entryId: string, userId: string, campaignId: string, input: CreateJournalEntryInput) {
    return this.db.journalEntry.create({
      data: {
        entryId,
        userId,
        campaignId,
        text: input.text,
        occurredAt: new Date(input.occurredAt),
        spoiler: input.spoiler ?? false,
      },
    });
  }
  async update(id: string, entryId: string, userId: string, input: UpdateJournalEntryInput) {
    const data: Prisma.JournalEntryUpdateManyMutationInput = {};
    if (input.text !== undefined) data.text = input.text;
    if (input.occurredAt !== undefined) data.occurredAt = new Date(input.occurredAt);
    if (input.spoiler !== undefined) data.spoiler = input.spoiler;
    const [row] = await this.db.journalEntry.updateManyAndReturn({
      where: { id, entryId, userId },
      data,
    });
    return row ?? null;
  }
  async remove(id: string, entryId: string, userId: string) {
    return (await this.db.journalEntry.deleteMany({ where: { id, entryId, userId } })).count;
  }
}
