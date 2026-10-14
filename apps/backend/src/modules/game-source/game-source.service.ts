import { NotFoundError } from '@/lib/errors.js';
import type { GameSourceRepository } from './game-source.repository.js';
import type { CreateGameSourceInput, UpdateGameSourceInput } from './game-source.schema.js';
export class GameSourceService {
  constructor(
    private readonly repository: Pick<GameSourceRepository, 'withUserLock' | 'findEntry' | 'list'>,
  ) {}
  async list(entryId: string, userId: string) {
    if (!(await this.repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
    return this.repository.list(entryId, userId);
  }
  create(entryId: string, userId: string, input: CreateGameSourceInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
      return repository.create(entryId, userId, input);
    });
  }
  update(id: string, entryId: string, userId: string, input: UpdateGameSourceInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const item = await repository.update(id, entryId, userId, input);
      if (!item) throw new NotFoundError('Origem');
      return item;
    });
  }
  remove(id: string, entryId: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.remove(id, entryId, userId))) throw new NotFoundError('Origem');
    });
  }
}
