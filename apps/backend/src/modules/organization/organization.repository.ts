import type { Prisma, PrismaClient } from '@/generated/prisma/client.js';
import type { OrganizationKind, UpdateOrganizationInput } from './organization.schema.js';
export class OrganizationRepository {
  constructor(
    private readonly database: PrismaClient,
    private readonly db: Prisma.TransactionClient = database,
  ) {}
  withUserLock<T>(userId: string, operation: (repository: OrganizationRepository) => Promise<T>) {
    return this.database.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      return operation(new OrganizationRepository(this.database, tx));
    });
  }
  list(kind: OrganizationKind, userId: string) {
    const args = { where: { userId }, orderBy: [{ name: 'asc' as const }, { id: 'asc' as const }] };
    return kind === 'collections' ? this.db.collection.findMany(args) : this.db.tag.findMany(args);
  }
  findByName(kind: OrganizationKind, userId: string, name: string) {
    const args = { where: { userId_name: { userId, name } } };
    return kind === 'collections'
      ? this.db.collection.findUnique(args)
      : this.db.tag.findUnique(args);
  }
  create(kind: OrganizationKind, userId: string, name: string) {
    return kind === 'collections'
      ? this.db.collection.create({ data: { userId, name } })
      : this.db.tag.create({ data: { userId, name } });
  }
  async update(kind: OrganizationKind, id: string, userId: string, name: string) {
    const args = { where: { id, userId }, data: { name } };
    const [row] =
      kind === 'collections'
        ? await this.db.collection.updateManyAndReturn(args)
        : await this.db.tag.updateManyAndReturn(args);
    return row ?? null;
  }
  async remove(kind: OrganizationKind, id: string, userId: string) {
    const args = { where: { id, userId } };
    return (
      kind === 'collections'
        ? await this.db.collection.deleteMany(args)
        : await this.db.tag.deleteMany(args)
    ).count;
  }
  findEntry(id: string, userId: string) {
    return this.db.libraryEntry.findFirst({ where: { id, userId }, select: { id: true } });
  }
  countOwned(kind: OrganizationKind, userId: string, ids: string[]) {
    const args = { where: { userId, id: { in: ids } } };
    return kind === 'collections' ? this.db.collection.count(args) : this.db.tag.count(args);
  }
  async replace(entryId: string, userId: string, input: UpdateOrganizationInput) {
    await this.db.collectionEntry.deleteMany({ where: { entryId, userId } });
    await this.db.tagEntry.deleteMany({ where: { entryId, userId } });
    if (input.collectionIds.length)
      await this.db.collectionEntry.createMany({
        data: input.collectionIds.map((collectionId) => ({ entryId, userId, collectionId })),
      });
    if (input.tagIds.length)
      await this.db.tagEntry.createMany({
        data: input.tagIds.map((tagId) => ({ entryId, userId, tagId })),
      });
    // Membership changes belong to the entry's edit history as well.
    await this.db.libraryEntry.update({
      where: { id: entryId, userId },
      data: { updatedAt: new Date() },
    });
    return input;
  }
}
