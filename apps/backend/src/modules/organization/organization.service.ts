import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors.js';
import type { OrganizationRepository } from './organization.repository.js';
import type {
  OrganizationKind,
  OrganizationNameInput,
  UpdateOrganizationInput,
} from './organization.schema.js';
export class OrganizationService {
  constructor(private readonly repository: Pick<OrganizationRepository, 'withUserLock' | 'list'>) {}
  list(kind: OrganizationKind, userId: string) {
    return this.repository.list(kind, userId);
  }
  create(kind: OrganizationKind, userId: string, input: OrganizationNameInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (await repository.findByName(kind, userId, input.name))
        throw new ConflictError('Nome já usado');
      return repository.create(kind, userId, input.name);
    });
  }
  update(kind: OrganizationKind, id: string, userId: string, input: OrganizationNameInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const existing = await repository.findByName(kind, userId, input.name);
      if (existing && existing.id !== id) throw new ConflictError('Nome já usado');
      const row = await repository.update(kind, id, userId, input.name);
      if (!row) throw new NotFoundError('Agrupamento');
      return row;
    });
  }
  remove(kind: OrganizationKind, id: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.remove(kind, id, userId))) throw new NotFoundError('Agrupamento');
    });
  }
  replace(entryId: string, userId: string, input: UpdateOrganizationInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
      const collections = await repository.countOwned('collections', userId, input.collectionIds);
      const tags = await repository.countOwned('tags', userId, input.tagIds);
      if (collections !== input.collectionIds.length || tags !== input.tagIds.length)
        throw new ValidationError('Coleção ou tag inválida');
      return repository.replace(entryId, userId, input);
    });
  }
}
