import type { PrismaClient } from '@/generated/prisma/client.js';
import type { CreateSavedFilterInput, UpdateSavedFilterInput } from './saved-filter.schema.js';

export class SavedFilterRepository {
  constructor(private readonly database: PrismaClient) {}

  findAll(userId: string) {
    return this.database.savedFilter.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  findById(id: string, userId: string) {
    return this.database.savedFilter.findFirst({ where: { id, userId } });
  }

  create(userId: string, input: CreateSavedFilterInput) {
    return this.database.savedFilter.create({ data: { ...input, userId } });
  }

  async update(id: string, userId: string, input: UpdateSavedFilterInput) {
    const [record] = await this.database.savedFilter.updateManyAndReturn({
      where: { id, userId },
      data: input,
    });
    return record ?? null;
  }

  async remove(id: string, userId: string) {
    const result = await this.database.savedFilter.deleteMany({ where: { id, userId } });
    return result.count;
  }
}
