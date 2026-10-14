import { HOURS_MAX } from '@detonado/shared';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors.js';
import type { PlaySessionRepository } from './play-session.repository.js';
import type { CreatePlaySessionInput, UpdatePlaySessionInput } from './play-session.schema.js';

export class PlaySessionService {
  constructor(
    private readonly repository: Pick<PlaySessionRepository, 'withUserLock' | 'findEntry' | 'list'>,
  ) {}
  async list(entryId: string, userId: string) {
    if (!(await this.repository.findEntry(entryId, userId))) throw new NotFoundError('Jogo');
    return this.repository.list(entryId, userId);
  }
  private async recalculate(
    repository: PlaySessionRepository,
    entryId: string,
    userId: string,
    baseHours: unknown,
  ) {
    const progress = await repository.progress(entryId, userId);
    const hours = Math.round((Number(baseHours ?? 0) + progress.minutes / 60) * 10) / 10;
    if (hours > HOURS_MAX) throw new ValidationError('Total de horas excede o limite');
    await repository.saveProgress(entryId, userId, hours, progress.lastSessionAt);
  }
  create(entryId: string, userId: string, input: CreatePlaySessionInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      const existing = await repository.findByClientId(userId, input.clientId.toLowerCase());
      if (existing) {
        if (
          existing.entryId !== entryId ||
          existing.playedAt.getTime() !== new Date(input.playedAt).getTime() ||
          existing.durationMinutes !== input.durationMinutes ||
          existing.notes !== (input.notes?.trim() || null)
        )
          throw new ConflictError('Identificador de sessão já usado com outros dados');
        return existing;
      }
      const row = await repository.create(entryId, userId, input);
      await this.recalculate(repository, entryId, userId, entry.baseHours);
      return row;
    });
  }
  update(id: string, entryId: string, userId: string, input: UpdatePlaySessionInput) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry) throw new NotFoundError('Jogo');
      const row = await repository.update(id, entryId, userId, input);
      if (!row) throw new NotFoundError('Sessão');
      await this.recalculate(repository, entryId, userId, entry.baseHours);
      return row;
    });
  }
  remove(id: string, entryId: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findEntry(entryId, userId);
      if (!entry || !(await repository.remove(id, entryId, userId)))
        throw new NotFoundError('Sessão');
      await this.recalculate(repository, entryId, userId, entry.baseHours);
    });
  }
}
