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

const GAME_WITH_HLTB = { ...GAME, hltb: HLTB, hltbStatus: 'FOUND' as const };

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
    findByName: vi.fn().mockResolvedValue({ status: 'FOUND', times: HLTB }),
    ...overrides,
  };
}

describe('GameService.search', () => {
  it('returns parsed cache on hit without calling IGDB or HLTB', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify([GAME])) });
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb, redis, hltb);

    const result = await service.search('witcher');

    expect(igdb.searchGames).not.toHaveBeenCalled();
    expect(hltb.findByName).not.toHaveBeenCalled();
    expect(result).toEqual([GAME]);
  });

  it('fetches from IGDB on cache miss and stores result with 10-min TTL', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb, redis, hltb);

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
    const service = new GameService(igdb, redis, hltb);

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
  it('refetches an invalid cached game instead of failing the request', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue('{broken') });
    const igdb = makeIgdb();
    const service = new GameService(igdb, redis, makeHltb());
    expect(await service.getById(1942)).toEqual(GAME_WITH_HLTB);
    expect(igdb.getGameById).toHaveBeenCalledWith(1942);
  });
  it('consults HLTB independently when the IGDB game is cached', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify(GAME)) });
    const igdb = makeIgdb();
    const hltb = makeHltb();
    const service = new GameService(igdb, redis, hltb);

    expect(await service.getById(1942)).toEqual(GAME_WITH_HLTB);
    expect(redis.get).toHaveBeenCalledWith('igdb:v2:game:1942');
    expect(igdb.getGameById).not.toHaveBeenCalled();
    expect(hltb.findByName).toHaveBeenCalledWith(GAME.name);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it.each([
    'FOUND',
    'MISS',
    'FAILED',
  ] as const)('caches only the IGDB data when HLTB returns %s', async (status) => {
    const redis = makeRedis();
    const hltb = makeHltb({
      findByName: vi
        .fn()
        .mockResolvedValue(status === 'FOUND' ? { status, times: HLTB } : { status }),
    });
    const service = new GameService(makeIgdb(), redis, hltb);

    expect(await service.getById(1942)).toEqual({
      ...GAME,
      hltb: status === 'FOUND' ? HLTB : null,
      hltbStatus: status,
    });
    expect(redis.set).toHaveBeenCalledWith('igdb:v2:game:1942', JSON.stringify(GAME), {
      EX: 86400,
    });
  });

  it('recovers from a miss without waiting for the IGDB cache to expire', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(JSON.stringify(GAME)) });
    const hltb = makeHltb({
      findByName: vi
        .fn()
        .mockResolvedValueOnce({ status: 'MISS' })
        .mockResolvedValueOnce({ status: 'FOUND', times: HLTB }),
    });
    const service = new GameService(makeIgdb(), redis, hltb);

    expect(await service.getById(1942)).toMatchObject({ hltbStatus: 'MISS' });
    expect(await service.getById(1942)).toEqual(GAME_WITH_HLTB);
  });

  it('throws not found before HLTB and skips caching when the game is not found', async () => {
    const redis = makeRedis();
    const igdb = makeIgdb({ getGameById: vi.fn().mockResolvedValue(null) });
    const hltb = makeHltb();
    const service = new GameService(igdb, redis, hltb);

    await expect(service.getById(999999)).rejects.toMatchObject({ statusCode: 404 });

    expect(igdb.getGameById).toHaveBeenCalledWith(999999);
    expect(hltb.findByName).not.toHaveBeenCalled();
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
