import { NotFoundError } from '@/lib/errors.js';
import type { SavedFilterRepository } from './saved-filter.repository.js';
import type { CreateSavedFilterInput, UpdateSavedFilterInput } from './saved-filter.schema.js';
import { savedFilterResponseSchema } from './saved-filter.schema.js';

type SavedFilterStore = Pick<
  SavedFilterRepository,
  'findAll' | 'findById' | 'create' | 'update' | 'remove'
>;

export class SavedFilterService {
  constructor(private readonly repository: SavedFilterStore) {}

  async list(userId: string) {
    const records = await this.repository.findAll(userId);
    return records.map((record) => savedFilterResponseSchema.parse(record));
  }

  async getById(id: string, userId: string) {
    const record = await this.repository.findById(id, userId);
    if (!record) throw new NotFoundError('Filtro salvo');
    return savedFilterResponseSchema.parse(record);
  }

  async create(userId: string, input: CreateSavedFilterInput) {
    const record = await this.repository.create(userId, input);
    return savedFilterResponseSchema.parse(record);
  }

  async update(id: string, userId: string, input: UpdateSavedFilterInput) {
    const record = await this.repository.update(id, userId, input);
    if (!record) throw new NotFoundError('Filtro salvo');
    return savedFilterResponseSchema.parse(record);
  }

  async remove(id: string, userId: string) {
    const removed = await this.repository.remove(id, userId);
    if (removed === 0) throw new NotFoundError('Filtro salvo');
  }
}
