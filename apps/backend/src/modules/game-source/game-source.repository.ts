import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { CreateGameSourceInput, UpdateGameSourceInput } from './game-source.schema.js';
export class GameSourceRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}
  withUserLock<T>(userId: string, operation: (repository: GameSourceRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new GameSourceRepository(this.database, tx));
    });
  }
  findEntry(entryId: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id: entryId, userId }, select: { id: true } });
  }
  list(entryId: string, userId: string) {
    return this.db.gameSource.findMany({
      where: { entryId, userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  create(entryId: string, userId: string, input: CreateGameSourceInput) {
    return this.db.gameSource.create({
      data: {
        entryId,
        userId,
        kind: input.kind,
        label: input.label,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
  }
  async update(id: string, entryId: string, userId: string, input: UpdateGameSourceInput) {
    const data: Prisma.GameSourceUpdateManyMutationInput = {};
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.label !== undefined) data.label = input.label;
    if (input.expiresAt !== undefined)
      data.expiresAt = input.expiresAt === null ? null : new Date(input.expiresAt);
    const [row] = await this.db.gameSource.updateManyAndReturn({
      where: { id, entryId, userId },
      data,
    });
    return row ?? null;
  }
  async remove(id: string, entryId: string, userId: string) {
    return (await this.db.gameSource.deleteMany({ where: { id, entryId, userId } })).count;
  }
}
