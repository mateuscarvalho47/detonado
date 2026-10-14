import { NotFoundError } from '@/lib/errors.js';
import type { ChecklistItemRepository } from './checklist-item.repository.js';
import type {
  CreateChecklistItemInput,
  UpdateChecklistItemInput,
} from './checklist-item.schema.js';
export class ChecklistItemService {
  constructor(
    private readonly repository: Pick<
      ChecklistItemRepository,
      'withUserLock' | 'findEntry' | 'list'
    >,
  ) {}
  async list(entryId: string, userId: string) {
    if (!(await this.repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
    return this.repository.list(entryId, userId);
  }
  create(entryId: string, userId: string, input: CreateChecklistItemInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
      return repository.create(entryId, userId, input);
    });
  }
  update(id: string, entryId: string, userId: string, input: UpdateChecklistItemInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const item = await repository.update(id, entryId, userId, input);
      if (!item) throw new NotFoundError('Item');
      return item;
    });
  }
  remove(id: string, entryId: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.remove(id, entryId, userId))) throw new NotFoundError('Item');
    });
  }
}
