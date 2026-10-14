import { ConflictError, NotFoundError } from '@/lib/errors.js';
import type { JournalEntryRepository } from './journal-entry.repository.js';
import type { CreateJournalEntryInput, UpdateJournalEntryInput } from './journal-entry.schema.js';
export class JournalEntryService {
  constructor(
    private readonly repository: Pick<
      JournalEntryRepository,
      'withUserLock' | 'findEntry' | 'findCampaign' | 'list'
    >,
  ) {}
  async list(entryId: string, userId: string, campaignId?: string) {
    if (!(await this.repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
    if (campaignId && !(await this.repository.findCampaign(campaignId, entryId, userId)))
      throw new NotFoundError('Campanha');
    return this.repository.list(entryId, userId, campaignId);
  }
  create(entryId: string, userId: string, input: CreateJournalEntryInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      if (
        !entry.activeCampaignId ||
        (input.campaignId !== undefined && input.campaignId !== entry.activeCampaignId)
      )
        throw new ConflictError('Campanha ativa mudou. Confira a anotação antes de registrar.');
      return repository.create(entryId, userId, entry.activeCampaignId, input);
    });
  }
  update(id: string, entryId: string, userId: string, input: UpdateJournalEntryInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const row = await repository.update(id, entryId, userId, input);
      if (!row) throw new NotFoundError('Anotação');
      return row;
    });
  }
  remove(id: string, entryId: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      if (!(await repository.remove(id, entryId, userId))) throw new NotFoundError('Anotação');
    });
  }
}
