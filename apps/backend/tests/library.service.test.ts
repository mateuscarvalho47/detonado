import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors.js';
import { calendarToday } from '@/modules/library/library.dates.js';
import {
  LibraryEntryAlreadyExistsError,
  LibraryEntryNotFoundError,
  LibraryEntryNotInQueueError,
} from '@/modules/library/library.errors.js';
import { LibraryService } from '@/modules/library/library.service.js';

const GAME = {
  igdbId: 1,
  name: 'Elden Ring',
  coverUrl: 'https://img.igdb.com/cover.jpg',
  platforms: ['PC', 'PS5'],
  genres: ['RPG'],
  summary: undefined,
  releaseYear: 2022,
};

const ENTRY = {
  id: 'entry-1',
  userId: 'user-1',
  igdbId: 1,
  name: 'Elden Ring',
  coverUrl: 'https://img.igdb.com/cover.jpg',
  genres: ['RPG'],
  platforms: ['PC', 'PS5'],
  status: 'BACKLOG' as const,
  userPlatform: null,
  rating: null,
  hoursPlayed: null,
  notes: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepo(overrides: Record<string, unknown> = {}) {
  return {
    findAllByUser: vi.fn(),
    findByIdAndUser: vi.fn(),
    findByUserAndIgdbId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateHltb: vi.fn(),
    delete: vi.fn(),
    nextQueuePosition: vi.fn().mockResolvedValue(1),
    moveInQueue: vi.fn(),
    ...overrides,
  };
}

function makeGames(overrides: Record<string, unknown> = {}) {
  return {
    getById: vi.fn().mockResolvedValue(GAME),
    search: vi.fn(),
    lookupByName: vi.fn(),
    ...overrides,
  };
}

describe('LibraryService.create', () => {
  it('creates entry with snapshot from IGDB', async () => {
    const repo = makeRepo({
      findByUserAndIgdbId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(ENTRY),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    const result = await service.create('user-1', { igdbId: 1, status: 'BACKLOG' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        igdbId: 1,
        name: 'Elden Ring',
        status: 'BACKLOG',
        completedAt: null,
        queuePosition: 1,
      }),
    );
    expect(repo.nextQueuePosition).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(ENTRY);
  });

  it('sets completedAt when status is COMPLETED', async () => {
    const repo = makeRepo({
      findByUserAndIgdbId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED' }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.create('user-1', { igdbId: 1, status: 'COMPLETED' });

    const passed = repo.create.mock.calls[0]?.[0] as {
      completedAt: Date;
      queuePosition: number | null;
    };
    expect(passed.completedAt.toISOString()).toBe(calendarToday().toISOString());
    expect(passed.queuePosition).toBeNull();
    expect(repo.nextQueuePosition).not.toHaveBeenCalled();
  });

  it('throws LibraryEntryAlreadyExistsError on duplicate', async () => {
    const repo = makeRepo({ findByUserAndIgdbId: vi.fn().mockResolvedValue(ENTRY) });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.create('user-1', { igdbId: 1, status: 'BACKLOG' })).rejects.toThrow(
      LibraryEntryAlreadyExistsError,
    );
  });

  it('stores a miss without inventing times', async () => {
    const repo = makeRepo({
      findByUserAndIgdbId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(ENTRY),
    });
    const games = makeGames({
      getById: vi.fn().mockResolvedValue({ ...GAME, hltb: null, hltbStatus: 'MISS' }),
    });
    const service = new LibraryService(repo as never, games as never);

    await service.create('user-1', { igdbId: 1, status: 'BACKLOG' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hltbMain: null,
        hltbMainExtra: null,
        hltbCompletionist: null,
        hltbStatus: 'MISS',
      }),
    );
  });

  it('stores times when the lookup is found', async () => {
    const repo = makeRepo({
      findByUserAndIgdbId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(ENTRY),
    });
    const games = makeGames({
      getById: vi.fn().mockResolvedValue({
        ...GAME,
        hltbStatus: 'FOUND',
        hltb: { mainHours: 40, mainExtraHours: 60, completionistHours: null },
      }),
    });
    const service = new LibraryService(repo as never, games as never);

    await service.create('user-1', { igdbId: 1, status: 'BACKLOG' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hltbMain: 40,
        hltbMainExtra: 60,
        hltbCompletionist: null,
        hltbStatus: 'FOUND',
      }),
    );
  });

  it('throws LibraryEntryNotFoundError when IGDB game not found', async () => {
    const repo = makeRepo({ findByUserAndIgdbId: vi.fn().mockResolvedValue(null) });
    const games = makeGames({ getById: vi.fn().mockResolvedValue(null) });
    const service = new LibraryService(repo as never, games as never);

    await expect(service.create('user-1', { igdbId: 999, status: 'BACKLOG' })).rejects.toThrow(
      LibraryEntryNotFoundError,
    );
  });
});

describe('LibraryService.update', () => {
  it('throws LibraryEntryNotFoundError when entry does not belong to user', async () => {
    const repo = makeRepo({ findByIdAndUser: vi.fn().mockResolvedValue(null) });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.update('entry-1', 'user-1', { status: 'PLAYING' })).rejects.toThrow(
      LibraryEntryNotFoundError,
    );
  });

  it('sets completedAt when transitioning to COMPLETED and it was null', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, completedAt: null }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED' }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'COMPLETED' });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ completedAt: calendarToday(), queuePosition: null }),
    );
  });

  it('clears completedAt when the status leaves COMPLETED', async () => {
    const completedAt = new Date('2024-01-01');
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED', completedAt }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'PAUSED', completedAt: null }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'PAUSED' });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ completedAt: null }),
    );
  });

  it('clears completedAt when the date is sent empty', async () => {
    const completedAt = new Date('2024-01-01');
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED', completedAt }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, completedAt: null }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'COMPLETED', completedAt: null });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ completedAt: null }),
    );
  });

  it('forwards zero hours and a cleared platform', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      update: vi.fn().mockResolvedValue({ ...ENTRY, hoursPlayed: 0, userPlatform: null }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { hoursPlayed: 0, userPlatform: '' });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ hoursPlayed: 0, userPlatform: null }),
    );
  });

  it('does not overwrite completedAt when already completed', async () => {
    const completedAt = new Date('2024-01-01');
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED', completedAt }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED', completedAt }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'COMPLETED' });

    const payload = repo.update.mock.calls[0]?.[2] as { completedAt?: Date };
    expect(payload).not.toHaveProperty('completedAt');
  });

  it('keeps stored hours when the status moves to the queue', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, hoursPlayed: 12, rating: 8 }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'BACKLOG' }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'BACKLOG' });

    const payload = repo.update.mock.calls[0]?.[2] as { hoursPlayed?: number; rating?: number };
    expect(payload).not.toHaveProperty('hoursPlayed');
    expect(payload).not.toHaveProperty('rating');
    expect(payload).not.toHaveProperty('queuePosition');
    expect(repo.nextQueuePosition).not.toHaveBeenCalled();
  });

  it('appends a game that enters the queue', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, status: 'PLAYING' }),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'BACKLOG', queuePosition: 4 }),
      nextQueuePosition: vi.fn().mockResolvedValue(4),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'BACKLOG' });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ status: 'BACKLOG', queuePosition: 4 }),
    );
  });

  it('stores hours sent for a wishlist entry', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      update: vi
        .fn()
        .mockResolvedValue({ ...ENTRY, status: 'WISHLIST', hoursPlayed: 12, rating: 7 }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'WISHLIST', hoursPlayed: 12, rating: 7 });

    expect(repo.update).toHaveBeenCalledWith(
      'entry-1',
      'user-1',
      expect.objectContaining({ hoursPlayed: 12, rating: 7 }),
    );
  });

  it('stores a completion date as UTC midnight of that calendar day', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      update: vi.fn().mockResolvedValue({ ...ENTRY, status: 'COMPLETED' }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.update('entry-1', 'user-1', { status: 'COMPLETED', completedAt: '2024-05-03' });

    const payload = repo.update.mock.calls[0]?.[2] as { completedAt: Date };
    expect(payload.completedAt.toISOString()).toBe('2024-05-03T00:00:00.000Z');
  });

  it('rejects a calendar date that does not exist', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      update: vi.fn(),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(
      service.update('entry-1', 'user-1', { status: 'COMPLETED', completedAt: '2023-02-29' }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('throws when the owner row disappears before the write', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      update: vi.fn().mockResolvedValue(null),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.update('entry-1', 'user-1', { status: 'PLAYING' })).rejects.toThrow(
      LibraryEntryNotFoundError,
    );
  });
});

describe('LibraryService.refreshHltb', () => {
  it('replaces a failed lookup with the new result', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      updateHltb: vi.fn().mockResolvedValue({ ...ENTRY, hltbStatus: 'FOUND', hltbMain: 12 }),
    });
    const games = makeGames({
      lookupByName: vi.fn().mockResolvedValue({
        status: 'FOUND',
        times: { mainHours: 12, mainExtraHours: null, completionistHours: null },
      }),
    });
    const service = new LibraryService(repo as never, games as never);

    await service.refreshHltb('entry-1', 'user-1');

    expect(games.lookupByName).toHaveBeenCalledWith('Elden Ring');
    expect(repo.updateHltb).toHaveBeenCalledWith('entry-1', 'user-1', {
      hltbMain: 12,
      hltbMainExtra: null,
      hltbCompletionist: null,
      hltbStatus: 'FOUND',
    });
  });

  it('stores a miss when the new lookup finds nothing', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      updateHltb: vi.fn().mockResolvedValue({ ...ENTRY, hltbStatus: 'MISS' }),
    });
    const games = makeGames({
      lookupByName: vi.fn().mockResolvedValue({ status: 'MISS' }),
    });
    const service = new LibraryService(repo as never, games as never);

    await service.refreshHltb('entry-1', 'user-1');

    expect(repo.updateHltb).toHaveBeenCalledWith('entry-1', 'user-1', {
      hltbMain: null,
      hltbMainExtra: null,
      hltbCompletionist: null,
      hltbStatus: 'MISS',
    });
  });
});

describe('LibraryService.getById', () => {
  it('returns entry for valid owner', async () => {
    const repo = makeRepo({ findByIdAndUser: vi.fn().mockResolvedValue(ENTRY) });
    const service = new LibraryService(repo as never, makeGames() as never);

    const result = await service.getById('entry-1', 'user-1');
    expect(result).toEqual(ENTRY);
  });

  it('throws LibraryEntryNotFoundError when entry not found', async () => {
    const repo = makeRepo({ findByIdAndUser: vi.fn().mockResolvedValue(null) });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.getById('entry-1', 'user-1')).rejects.toThrow(LibraryEntryNotFoundError);
  });
});

describe('LibraryService.remove', () => {
  it('deletes entry for valid owner', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      delete: vi.fn().mockResolvedValue(undefined),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await service.remove('entry-1', 'user-1');
    expect(repo.delete).toHaveBeenCalledWith('entry-1', 'user-1');
  });

  it('throws when the delete matches no row', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      delete: vi.fn().mockResolvedValue(0),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.remove('entry-1', 'user-1')).rejects.toThrow(LibraryEntryNotFoundError);
  });

  it('throws LibraryEntryNotFoundError when entry not found', async () => {
    const repo = makeRepo({ findByIdAndUser: vi.fn().mockResolvedValue(null) });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.remove('entry-1', 'user-1')).rejects.toThrow(LibraryEntryNotFoundError);
  });
});

describe('LibraryService.list', () => {
  it('returns all entries for the given user', async () => {
    const entries = [ENTRY, { ...ENTRY, id: 'entry-2', igdbId: 2, name: 'Hollow Knight' }];
    const repo = makeRepo({ findAllByUser: vi.fn().mockResolvedValue(entries) });
    const service = new LibraryService(repo as never, makeGames() as never);

    const result = await service.list('user-1');

    expect(result).toEqual(entries);
    expect(repo.findAllByUser).toHaveBeenCalledWith('user-1');
  });

  it('returns empty array when user has no entries', async () => {
    const repo = makeRepo({ findAllByUser: vi.fn().mockResolvedValue([]) });
    const service = new LibraryService(repo as never, makeGames() as never);

    const result = await service.list('user-1');

    expect(result).toEqual([]);
  });
});

describe('LibraryService.moveInQueue', () => {
  it('rejects a game that is not in the queue', async () => {
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue({ ...ENTRY, status: 'PLAYING' }),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.moveInQueue('entry-1', 'user-1', 'up')).rejects.toThrow(
      LibraryEntryNotInQueueError,
    );
    expect(repo.moveInQueue).not.toHaveBeenCalled();
  });

  it('asks the repository to move a queued game', async () => {
    const moved = { ...ENTRY, queuePosition: 1 };
    const repo = makeRepo({
      findByIdAndUser: vi.fn().mockResolvedValue(ENTRY),
      moveInQueue: vi.fn().mockResolvedValue(moved),
    });
    const service = new LibraryService(repo as never, makeGames() as never);

    await expect(service.moveInQueue('entry-1', 'user-1', 'up')).resolves.toEqual(moved);
    expect(repo.moveInQueue).toHaveBeenCalledWith('user-1', 'entry-1', 'up');
  });
});
