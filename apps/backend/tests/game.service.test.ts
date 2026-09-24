import { describe, expect, it, vi } from 'vitest';
import { searchQuerySchema } from '@/modules/game/game.schema.js';
import { GameService } from '@/modules/game/game.service.js';

const GAME = {
  igdbId: 1942,
  name: 'The Witcher 3: Wild Hunt',
  coverUrl: 'https://images.igdb.com/cover.jpg',
  releaseYear: 2015,
  platforms: ['PC (Microsoft Windows)', 'PlayStation 4'],
  genres: ['Role-playing (RPG)'],
  summary: 'A story-driven open world RPG.',
};

const HLTB = {
  mainHours: 51.5,
  mainExtraHours: 102,
  completionistHours: 170,
};

const GAME_WITH_HLTB = { ...GAME, hltb: HLTB };

function makeIgdb(overrides: Record<string, unknown> = {}) {
  return {
    searchGames: vi.fn().mockResolvedValue([GAME]),
    getGameById: vi.fn().mockResolvedValue(GAME),
    ...overrides,
  };
}

function makeRedis(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    ...overrides,
  };
}

function makeHltb(overrides: Record<string, unknown> = {}) {
  return {
    findByName: vi.fn().mockResolvedValue(HLTB),
    ...overrides,
  };
}

describe('GameService.search', () => {
  it('returns parsed cache on hit without calling IGDB or HLTB', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify([GAME])) });
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.search('witcher');

    expect(igdb.searchGames).not.toHaveBeenCalled();
    expect(hltb.findByName).not.toHaveBeenCalled();
    expect(result).toEqual([GAME]);
  });

  it('fetches from IGDB on cache miss and stores result with 10-min TTL', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.search('witcher');

    expect(igdb.searchGames).toHaveBeenCalledWith('witcher');
    expect(hltb.findByName).not.toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalledWith('igdb:search:witcher', JSON.stringify([GAME]), {
      EX: 600,
    });
    expect(result).toEqual([GAME]);
  });

  it('uses the exact query string as part of the cache key', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    await service.search('dark souls');

    expect(redis.get).toHaveBeenCalledWith('igdb:search:dark souls');
    expect(redis.set).toHaveBeenCalledWith(
      'igdb:search:dark souls',
      expect.any(String),
      expect.any(Object),
    );
    expect(hltb.findByName).not.toHaveBeenCalled();
  });
});

describe('GameService.getById', () => {
  it('returns a cached game that already has hltb without calling IGDB or HLTB', async () => {
    const redis = makeRedis({
      get: vi.fn().mockResolvedValue(JSON.stringify(GAME_WITH_HLTB)),
    });
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.getById(1942);

    expect(igdb.getGameById).not.toHaveBeenCalled();
    expect(hltb.findByName).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
    expect(result).toEqual(GAME_WITH_HLTB);
  });

  it('backfills hltb for a cached game without calling IGDB and stores the merge', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify(GAME)) });
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.getById(1942);

    expect(igdb.getGameById).not.toHaveBeenCalled();
    expect(hltb.findByName).toHaveBeenCalledTimes(1);
    expect(hltb.findByName).toHaveBeenCalledWith(GAME.name);
    expect(redis.set).toHaveBeenCalledWith('igdb:game:1942', JSON.stringify(GAME_WITH_HLTB), {
      EX: 86400,
    });
    expect(result).toEqual(GAME_WITH_HLTB);
  });

  it('fetches from IGDB and HLTB on cache miss and stores the merge for 24h', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.getById(1942);

    expect(igdb.getGameById).toHaveBeenCalledWith(1942);
    expect(hltb.findByName).toHaveBeenCalledWith(GAME.name);
    expect(redis.set).toHaveBeenCalledWith('igdb:game:1942', JSON.stringify(GAME_WITH_HLTB), {
      EX: 86400,
    });
    expect(result).toEqual(GAME_WITH_HLTB);
  });

  it('returns null before HLTB and skips caching when the game is not found', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb({ getGameById: vi.fn().mockResolvedValue(null) });
    const hltb = makeHltb();
    const service = new GameService(igdb as never, redis as never, hltb as never);

    const result = await service.getById(999999);

    expect(igdb.getGameById).toHaveBeenCalledWith(999999);
    expect(hltb.findByName).not.toHaveBeenCalled();
    expect(result).toBeNull();
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('searchQuerySchema validation', () => {
  it('accepts a query of 2 characters', () => {
    expect(() => searchQuerySchema.parse({ q: 'ab' })).not.toThrow();
  });

  it('rejects a query shorter than 2 characters', () => {
    expect(() => searchQuerySchema.parse({ q: 'a' })).toThrow();
  });

  it('rejects an empty query', () => {
    expect(() => searchQuerySchema.parse({ q: '' })).toThrow();
  });

  it('rejects missing q field', () => {
    expect(() => searchQuerySchema.parse({})).toThrow();
  });

  it('accepts a query of 100 characters', () => {
    expect(() => searchQuerySchema.parse({ q: 'a'.repeat(100) })).not.toThrow();
  });

  it('rejects a query longer than 100 characters', () => {
    expect(() => searchQuerySchema.parse({ q: 'a'.repeat(101) })).toThrow();
  });
});
