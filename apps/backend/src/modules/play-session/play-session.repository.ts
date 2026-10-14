import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { CreatePlaySessionInput, UpdatePlaySessionInput } from './play-session.schema.js';

export class PlaySessionRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}

  withUserLock<T>(userId: string, operation: (repository: PlaySessionRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new PlaySessionRepository(this.database, tx));
    });
  }
  findEntry(entryId: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id: entryId, userId } });
  }
  list(entryId: string, userId: string, campaignId: string) {
    return this.db.playSession.findMany({
      where: { entryId, userId, campaignId },
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
    });
  }
  findByClientId(userId: string, clientId: string) {
    return this.db.playSession.findUnique({ where: { userId_clientId: { userId, clientId } } });
  }
  find(id: string, entryId: string, userId: string) {
    return this.db.playSession.findFirst({ where: { id, entryId, userId } });
  }
  create(entryId: string, userId: string, campaignId: string, input: CreatePlaySessionInput) {
    return this.db.playSession.create({
      data: {
        entryId,
        userId,
        campaignId,
        clientId: input.clientId.toLowerCase(),
        playedAt: new Date(input.playedAt),
        durationMinutes: input.durationMinutes,
        notes: input.notes?.trim() || null,
      },
    });
  }
  async update(id: string, entryId: string, userId: string, input: UpdatePlaySessionInput) {
    const data: Prisma.PlaySessionUpdateManyMutationInput = {};
    if (input.playedAt !== undefined) data.playedAt = new Date(input.playedAt);
    if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
    if (input.notes !== undefined) data.notes = input.notes?.trim() || null;
    const [row] = await this.db.playSession.updateManyAndReturn({
      where: { id, entryId, userId },
      data,
    });
    return row ?? null;
  }
  async remove(id: string, entryId: string, userId: string) {
    return (await this.db.playSession.deleteMany({ where: { id, entryId, userId } })).count;
  }
  async progress(entryId: string, userId: string, campaignId: string) {
    const result = await this.db.playSession.aggregate({
      where: { entryId, userId, campaignId },
      _sum: { durationMinutes: true },
      _max: { playedAt: true },
    });
    return { minutes: result._sum.durationMinutes ?? 0, lastSessionAt: result._max.playedAt };
  }
  findCampaign(id: string, entryId: string, userId: string) {
    return this.db.campaign.findFirst({ where: { id, entryId, userId } });
  }
  saveCampaignProgress(id: string, entryId: string, userId: string, hoursPlayed: number) {
    return this.db.campaign.update({ where: { id, entryId, userId }, data: { hoursPlayed } });
  }
  saveProgress(entryId: string, userId: string, hoursPlayed: number, lastSessionAt: Date | null) {
    return this.db.libraryEntry.update({
      where: { id: entryId, userId },
      data: { hoursPlayed, lastSessionAt },
    });
  }
}
