import { HOURS_MAX } from '@detonado/shared';
import type { LibraryEntry } from '@/generated/prisma/client.js';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors.js';
import type { PlaySessionRepository } from './play-session.repository.js';
import type { CreatePlaySessionInput, UpdatePlaySessionInput } from './play-session.schema.js';

export class PlaySessionService {
  constructor(
    private readonly repository: Pick<
      PlaySessionRepository,
      'withUserLock' | 'findEntry' | 'list' | 'findCampaign'
    >,
  ) {}
  async list(entryId: string, userId: string, requestedCampaignId?: string) {
    const entry = await this.repository.findEntry(entryId, userId);
    if (!entry) throw new NotFoundError('Jogo');
    const campaignId = requestedCampaignId ?? entry.activeCampaignId;
    if (!campaignId || !(await this.repository.findCampaign(campaignId, entryId, userId)))
      throw new NotFoundError('Campanha');
    return this.repository.list(entryId, userId, campaignId);
  }
  private async recalculate(
    repository: PlaySessionRepository,
    entry: LibraryEntry,
    campaignId: string,
  ) {
    const campaign = await repository.findCampaign(campaignId, entry.id, entry.userId);
    if (!campaign) throw new NotFoundError('Campanha');
    const active = entry.activeCampaignId === campaignId;
    const baseHours = active ? entry.baseHours : campaign.baseHours;
    const progress = await repository.progress(entry.id, entry.userId, campaignId);
    const hours = Math.round((Number(baseHours ?? 0) + progress.minutes / 60) * 10) / 10;
    if (hours > HOURS_MAX) throw new ValidationError('Total de horas excede o limite');
    if (active)
      await repository.saveProgress(entry.id, entry.userId, hours, progress.lastSessionAt);
    else await repository.saveCampaignProgress(campaignId, entry.id, entry.userId, hours);
  }
  create(entryId: string, userId: string, input: CreatePlaySessionInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      const existing = await repository.findByClientId(userId, input.clientId.toLowerCase());
      if (existing) {
        if (
          existing.entryId !== entryId ||
          (input.campaignId !== undefined && input.campaignId !== existing.campaignId) ||
          existing.playedAt.getTime() !== new Date(input.playedAt).getTime() ||
          existing.durationMinutes !== input.durationMinutes ||
          existing.notes !== (input.notes?.trim() || null)
        )
          throw new ConflictError('Identificador de sessão já usado com outros dados');
        return existing;
      }
      if (
        !entry.activeCampaignId ||
        (input.campaignId !== undefined && input.campaignId !== entry.activeCampaignId)
      )
        throw new ConflictError('Campanha ativa mudou. Confira a sessão antes de registrar.');
      const row = await repository.create(entryId, userId, entry.activeCampaignId, input);
      await this.recalculate(repository, entry, row.campaignId);
      return row;
    });
  }
  update(id: string, entryId: string, userId: string, input: UpdatePlaySessionInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      const row = await repository.update(id, entryId, userId, input);
      if (!row) throw new NotFoundError('Sessão');
      await this.recalculate(repository, entry, row.campaignId);
      return row;
    });
  }
  remove(id: string, entryId: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      const row = await repository.find(id, entryId, userId);
      if (!entry || !row || !(await repository.remove(id, entryId, userId)))
        throw new NotFoundError('Sessão');
      await this.recalculate(repository, entry, row.campaignId);
    });
  }
}
