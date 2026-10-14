import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from './checklist-item.schema.js';
export class ChecklistItemRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}
  withUserLock<T>(userId: string, operation: (repository: ChecklistItemRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new ChecklistItemRepository(this.database, tx));
    });
  }
  findEntry(entryId: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id: entryId, userId }, select: { id: true } });
  }
  list(entryId: string, userId: string) {
    return this.db.checklistItem.findMany({
      where: { entryId, userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  create(entryId: string, userId: string, input: CreateChecklistItemInput) {
    return this.db.checklistItem.create({ data: { entryId, userId, text: input.text } });
  }
  async update(id: string, entryId: string, userId: string, input: UpdateChecklistItemInput) {
    const [row] = await this.db.checklistItem.updateManyAndReturn({
      where: { id, entryId, userId },
      data: input,
    });
    return row ?? null;
  }
  async remove(id: string, entryId: string, userId: string) {
    return (await this.db.checklistItem.deleteMany({ where: { id, entryId, userId } })).count;
  }
}
