import { ValidationError } from '@/lib/errors.js';
import type { IgdbGame } from '@/lib/igdb/schemas.js';
import type { GameService } from '@/modules/game/game.service.js';
import { calendarToday, parseCalendarDate } from './library.dates.js';
import {
  LibraryEntryAlreadyExistsError,
  LibraryEntryNotFoundError,
  LibraryEntryNotInQueueError,
} from './library.errors.js';
import type { LibraryRepository } from './library.repository.js';
import type {
  CreateLibraryEntryInput,
  LibraryEntryChanges,
  LibraryStats,
  UpdateLibraryEntryInput,
} from './library.schema.js';

type LibraryStore = Pick<
  LibraryRepository,
  | 'findAllByUser'
  | 'findByIdAndUser'
  | 'findByUserAndIgdbId'
  | 'withUserLock'
  | 'updateHltb'
  | 'getStats'
>;
type LibraryGames = Pick<GameService, 'getById' | 'lookupByName'>;
type LibraryCreation = CreateLibraryEntryInput &
  Pick<UpdateLibraryEntryInput, 'hoursPlayed' | 'rating' | 'notes' | 'completedAt'>;

function resolveCompletedAt(
  nextStatus: string,
  inputCompletedAt: string | null | undefined,
  stored: Date | null,
): Date | null | undefined {
  if (nextStatus !== 'COMPLETED') return null;
  if (inputCompletedAt === undefined) return stored == null ? calendarToday() : undefined;
  if (inputCompletedAt === null) return null;
  return parseCalendarDate(inputCompletedAt);
}

function blankToNull(value: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function hltbSnapshot(game: IgdbGame) {
  if (game.hltbStatus === 'MISS' || game.hltbStatus === 'FAILED' || !game.hltb) {
    return {
      hltbMain: null,
      hltbMainExtra: null,
      hltbCompletionist: null,
      hltbStatus: game.hltbStatus === 'MISS' ? 'MISS' : 'FAILED',
    } as const;
  }

  return {
    hltbMain: game.hltb.mainHours,
    hltbMainExtra: game.hltb.mainExtraHours,
    hltbCompletionist: game.hltb.completionistHours,
    hltbStatus: 'FOUND',
  } as const;
}

export class LibraryService {
  constructor(
    private readonly repository: LibraryStore,
    private readonly games: LibraryGames,
  ) {}

  async list(userId: string) {
    return this.repository.findAllByUser(userId);
  }

  async getById(id: string, userId: string) {
    const entry = await this.repository.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();
    return entry;
  }

  async create(userId: string, input: LibraryCreation) {
    const duplicate = await this.repository.findByUserAndIgdbId(userId, input.igdbId);
    if (duplicate) throw new LibraryEntryAlreadyExistsError();

    const game = await this.games.getById(input.igdbId);
    if (!game) throw new LibraryEntryNotFoundError();

    return this.repository.withUserLock(userId, async (repository) => {
      // Provider calls run outside the lock; recheck after any concurrent insertion.
      const duplicate = await repository.findByUserAndIgdbId(userId, input.igdbId);
      if (duplicate) throw new LibraryEntryAlreadyExistsError();
      const completedAt = resolveCompletedAt(input.status, input.completedAt, null) ?? null;
      const hltb = hltbSnapshot(game);
      const queuePosition =
        input.status === 'BACKLOG' ? await repository.nextQueuePosition(userId) : null;

      return repository.create({
        user: { connect: { id: userId } },
        igdbId: input.igdbId,
        name: game.name,
        coverUrl: game.coverUrl ?? null,
        genres: game.genres,
        platforms: game.platforms,
        status: input.status,
        completionGoal: input.completionGoal ?? 'MAIN',
        hoursPlayed: input.hoursPlayed ?? null,
        baseHours: input.hoursPlayed ?? null,
        rating: input.rating ?? null,
        notes: blankToNull(input.notes ?? null),
        userPlatform: blankToNull(input.userPlatform ?? null),
        completedAt,
        queuePosition,
        ...hltb,
      });
    });
  }

  async update(
    id: string,
    userId: string,
    input: UpdateLibraryEntryInput,
    options?: { tagIds?: string[]; requireSupportedPlatform: boolean },
  ) {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findByIdAndUser(id, userId);
      if (!entry) throw new LibraryEntryNotFoundError();

      // Bulk validation happens before any membership, status or queue writes.
      if (
        options?.requireSupportedPlatform &&
        input.userPlatform != null &&
        !entry.platforms.includes(input.userPlatform)
      )
        throw new ValidationError('Plataforma não disponível para este jogo');
      if (
        options?.tagIds !== undefined &&
        (await repository.countOwnedTags(userId, options.tagIds)) !== options.tagIds.length
      )
        throw new ValidationError('Tag inválida');

      const { completedAt: requestedDate, userPlatform, ...editableFields } = input;
      const changes: LibraryEntryChanges = { ...editableFields };
      if (input.hoursPlayed !== undefined) {
        const minutes = await repository.sessionMinutes(id, userId);
        const sessionHours = Math.round(minutes / 6) / 10;
        if (minutes > 0 && (input.hoursPlayed === null || input.hoursPlayed < sessionHours)) {
          throw new ValidationError('Total de horas não pode ser menor que as sessões registradas');
        }
        changes.baseHours =
          input.hoursPlayed === null
            ? null
            : Math.round((input.hoursPlayed - sessionHours) * 10) / 10;
      }
      const nextStatus = input.status ?? entry.status;
      let completedAt: Date | null | undefined;
      if (!options || input.status !== undefined || requestedDate !== undefined)
        completedAt = resolveCompletedAt(nextStatus, requestedDate, entry.completedAt);

      if (userPlatform !== undefined) changes.userPlatform = blankToNull(userPlatform);
      if (completedAt !== undefined) changes.completedAt = completedAt;

      const statusChanged = input.status !== undefined && input.status !== entry.status;
      if (statusChanged && nextStatus === 'BACKLOG') {
        changes.queuePosition = await repository.nextQueuePosition(userId);
      } else if (statusChanged && entry.status === 'BACKLOG') {
        changes.queuePosition = null;
      }

      if (options?.tagIds !== undefined) await repository.replaceTags(id, userId, options.tagIds);
      const updated =
        Object.keys(changes).length === 0
          ? await repository.findByIdAndUser(id, userId)
          : await repository.update(id, userId, changes);
      if (!updated) throw new LibraryEntryNotFoundError();
      return updated;
    });
  }

  async refreshHltb(id: string, userId: string) {
    const entry = await this.repository.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();

    const lookup = await this.games.lookupByName(entry.name);
    if (lookup.status === 'FAILED') {
      // Keep the last known times; status describes the latest attempt.
      const updated = await this.repository.updateHltb(id, userId, { hltbStatus: 'FAILED' });
      if (!updated) throw new LibraryEntryNotFoundError();
      return updated;
    }

    const times = lookup.status === 'FOUND' ? lookup.times : null;
    const updated = await this.repository.updateHltb(id, userId, {
      hltbMain: times?.mainHours ?? null,
      hltbMainExtra: times?.mainExtraHours ?? null,
      hltbCompletionist: times?.completionistHours ?? null,
      hltbStatus: lookup.status,
    });
    if (!updated) throw new LibraryEntryNotFoundError();
    return updated;
  }

  async moveInQueue(id: string, userId: string, direction: 'up' | 'down') {
    return this.repository.withUserLock(userId, async (repository) => {
      const entry = await repository.findByIdAndUser(id, userId);
      if (!entry) throw new LibraryEntryNotFoundError();
      if (entry.status !== 'BACKLOG') throw new LibraryEntryNotInQueueError();
      const updated = await repository.moveInQueue(userId, id, direction);
      if (!updated) throw new LibraryEntryNotFoundError();
      return updated;
    });
  }

  async remove(id: string, userId: string) {
    return this.repository.withUserLock(userId, async (repository) => {
      const removed = await repository.delete(id, userId);
      if (removed === 0) throw new LibraryEntryNotFoundError();
    });
  }

  getStats(userId: string): Promise<LibraryStats> {
    return this.repository.getStats(userId);
  }
}
