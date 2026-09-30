import type { IgdbGame } from '@/lib/igdb/schemas.js';
import type { GameService } from '@/modules/game/game.service.js';
import { LibraryEntryAlreadyExistsError, LibraryEntryNotFoundError } from './library.errors.js';
import type { LibraryRepository } from './library.repository.js';
import type {
  CreateLibraryEntryInput,
  LibraryStats,
  UpdateLibraryEntryInput,
} from './library.schema.js';

const ALL_STATUSES = ['WISHLIST', 'BACKLOG', 'PLAYING', 'PAUSED', 'COMPLETED', 'DROPPED'] as const;

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
    private readonly repo: LibraryRepository,
    private readonly games: GameService,
  ) {}

  async list(userId: string) {
    return this.repo.findAllByUser(userId);
  }

  async getById(id: string, userId: string) {
    const entry = await this.repo.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();
    return entry;
  }

  async create(userId: string, input: CreateLibraryEntryInput) {
    const duplicate = await this.repo.findByUserAndIgdbId(userId, input.igdbId);
    if (duplicate) throw new LibraryEntryAlreadyExistsError();

    const game = await this.games.getById(input.igdbId);
    if (!game) throw new LibraryEntryNotFoundError();

    const completedAt = input.status === 'COMPLETED' ? new Date() : null;
    const hltb = hltbSnapshot(game);

    return this.repo.create({
      user: { connect: { id: userId } },
      igdbId: input.igdbId,
      name: game.name,
      coverUrl: game.coverUrl ?? null,
      genres: game.genres,
      platforms: game.platforms,
      status: input.status,
      userPlatform: input.userPlatform ?? null,
      completedAt,
      ...hltb,
    });
  }

  async update(id: string, userId: string, input: UpdateLibraryEntryInput) {
    const entry = await this.repo.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();

    const nextStatus = input.status ?? entry.status;
    const { completedAt: inputCompletedAt, userPlatform, ...restInput } = input;

    let completedAt: Date | null | undefined;
    if (nextStatus !== 'COMPLETED') {
      completedAt = null;
    } else if (inputCompletedAt !== undefined) {
      completedAt = inputCompletedAt ? new Date(inputCompletedAt) : null;
    } else if (entry.completedAt == null) {
      completedAt = new Date();
    }

    const platform = userPlatform === undefined ? undefined : blankToNull(userPlatform);

    return this.repo.update(id, {
      ...restInput,
      ...(userPlatform !== undefined ? { userPlatform: platform } : {}),
      completedAt,
    });
  }

  async refreshHltb(id: string, userId: string) {
    const entry = await this.repo.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();

    const lookup = await this.games.lookupByName(entry.name);
    const times = lookup.status === 'FOUND' ? lookup.times : null;
    return this.repo.updateHltb(id, {
      hltbMain: times?.mainHours ?? null,
      hltbMainExtra: times?.mainExtraHours ?? null,
      hltbCompletionist: times?.completionistHours ?? null,
      hltbStatus: lookup.status,
    });
  }

  async remove(id: string, userId: string) {
    const entry = await this.repo.findByIdAndUser(id, userId);
    if (!entry) throw new LibraryEntryNotFoundError();
    await this.repo.delete(id);
  }

  async getStats(userId: string): Promise<LibraryStats> {
    const {
      totalGames,
      totalHoursAgg,
      statusGroups,
      ratingGroups,
      topGenres,
      topPlatforms,
      completedTimeline,
    } = await this.repo.getStats(userId);

    const countByStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
      (typeof ALL_STATUSES)[number],
      number
    >;
    for (const g of statusGroups) {
      countByStatus[g.status] = g._count.status;
    }

    return {
      totalGames,
      totalHours: totalHoursAgg._sum.hoursPlayed ? Number(totalHoursAgg._sum.hoursPlayed) : 0,
      countByStatus,
      topGenres: topGenres.map((r) => ({ genre: r.genre, count: Number(r.count) })),
      topPlatforms: topPlatforms.map((r) => ({ platform: r.platform, count: Number(r.count) })),
      ratingDistribution: ratingGroups.map((r) => ({
        rating: r.rating as number,
        count: r._count.rating,
      })),
      completedTimeline: completedTimeline.map((r) => ({ month: r.month, count: Number(r.count) })),
    };
  }
}
