import { afterEach, describe, expect, it, vi } from 'vitest';
import { IgdbError, ValidationError } from '@/lib/errors.js';
import { escapeIgdbSearch, IgdbClient } from '@/lib/igdb/client.js';

const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret';
const TOKEN = 'test-access-token';
const TOKEN_RESPONSE = { access_token: TOKEN, expires_in: 3600, token_type: 'bearer' };

const RAW_GAME = {
  id: 1942,
  name: 'The Witcher 3: Wild Hunt',
  cover: { url: '//images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg' },
  first_release_date: 1431993600,
  platforms: [{ name: 'PC (Microsoft Windows)' }, { name: 'PlayStation 4' }],
  genres: [
    { id: 12, name: 'Role-playing (RPG)' },
    { id: 31, name: 'Adventure' },
  ],
  summary: 'A story-driven open world RPG.',
};

function makeRedis(overrides: Record<string, unknown> = {}) {
  return {
    get: vi.fn<(key: string) => Promise<string | null>>().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function mockResponse(data: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(data) };
}

function setupFetch(...calls: ReturnType<typeof mockResponse>[]) {
  const fetchMock = vi.fn();
  for (const call of calls) fetchMock.mockResolvedValueOnce(call);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('IgdbClient — token management', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses cached token from Redis without fetching a new one', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse([RAW_GAME]));

    await client.searchGames('witcher');

    expect(redis.get).toHaveBeenCalledWith('igdb:token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
    });
  });

  it('fetches a new token on cache miss and stores it with expires_in - 60 TTL', async () => {
    const redis = makeRedis();
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse(TOKEN_RESPONSE), mockResponse([]));

    await client.searchGames('witcher');

    expect(redis.set).toHaveBeenCalledWith('igdb:token', TOKEN, { EX: 3540 });
  });

  it('throws IgdbError when Twitch token endpoint returns an error', async () => {
    const redis = makeRedis();
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse(null, 500));

    await expect(client.searchGames('witcher')).rejects.toThrow(IgdbError);
  });

  it('shares simultaneous token requests and keeps credentials out of the URL', async () => {
    const client = new IgdbClient(makeRedis(), CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse(TOKEN_RESPONSE), mockResponse([]), mockResponse([]));
    await Promise.all([client.searchGames('witcher'), client.searchGames('hollow knight')]);
    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('oauth2/token'));
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0][0]).toBe('https://id.twitch.tv/oauth2/token');
    expect(tokenCalls[0][1].body.get('client_secret')).toBe(CLIENT_SECRET);
  });

  it('rejects malformed token responses before caching them', async () => {
    const redis = makeRedis();
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse({ access_token: '' }));
    await expect(client.searchGames('witcher')).rejects.toMatchObject({ statusCode: 502 });
    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('IgdbClient — searchGames', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns an empty array when IGDB returns no results', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse([]));

    await expect(client.searchGames('xyzzy')).resolves.toEqual([]);
  });

  it('transforms raw IGDB response to internal shape', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse([RAW_GAME]));

    const [game] = await client.searchGames('witcher');

    expect(game).toEqual({
      igdbId: 1942,
      name: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg',
      releaseYear: 2015,
      platforms: ['PC (Microsoft Windows)', 'PlayStation 4'],
      genres: ['RPG', 'Aventura'],
      summary: 'A story-driven open world RPG.',
    });
  });

  it('escapes quotes, backslashes and newlines inside the search literal', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse([]));

    expect(escapeIgdbSearch('ab"c\\d\n')).toBe('ab\\"c\\\\d ');

    await client.searchGames('ab"c\\d\n');

    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as string;
    expect(body).toContain('search "ab\\"c\\\\d "');
    expect(body).not.toContain('search "ab"c');
  });

  it('rejects a query outside 2 to 100 characters before calling IGDB', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse([]));

    await expect(client.searchGames('a')).rejects.toThrow(ValidationError);
    await expect(client.searchGames('a'.repeat(101))).rejects.toThrow(ValidationError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('handles games without optional fields', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse([{ id: 99, name: 'Bare Game' }]));

    const [game] = await client.searchGames('bare');

    expect(game).toEqual({
      igdbId: 99,
      name: 'Bare Game',
      coverUrl: undefined,
      releaseYear: undefined,
      platforms: [],
      genres: [],
      summary: undefined,
    });
  });
});

describe('IgdbClient — getGameById', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the transformed game when found', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse([RAW_GAME]));

    const game = await client.getGameById(1942);

    expect(game?.igdbId).toBe(1942);
    expect(game?.name).toBe('The Witcher 3: Wild Hunt');
  });

  it('returns null when IGDB returns an empty array', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse([]));

    await expect(client.getGameById(999999)).resolves.toBeNull();
  });
});

describe('IgdbClient — error mapping', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects malformed game payloads as an upstream failure', async () => {
    const client = new IgdbClient(
      makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) }),
      CLIENT_ID,
      CLIENT_SECRET,
    );
    setupFetch(mockResponse([{ id: 1 }]));
    await expect(client.searchGames('test')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('keeps the deadline active while reading the response body', async () => {
    const client = new IgdbClient(
      makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) }),
      CLIENT_ID,
      CLIENT_SECRET,
      20,
    );
    let aborted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => ({
        ok: true,
        status: 200,
        json: () =>
          new Promise((_resolve, reject) => {
            const abort = () => {
              aborted = true;
              reject(init.signal?.reason);
            };
            if (init.signal?.aborted) abort();
            else init.signal?.addEventListener('abort', abort, { once: true });
          }),
      })),
    );
    await expect(client.searchGames('test')).rejects.toMatchObject({ statusCode: 504 });
    expect(aborted).toBe(true);
  });

  it('maps an upstream query rejection to 502', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse(null, 400));

    await expect(client.searchGames('test')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('deletes igdb:token and throws IgdbError 502 when IGDB returns 401 twice', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse(null, 401), mockResponse(null, 401));

    const err = await client.searchGames('test').catch((e: unknown) => e);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(redis.del).toHaveBeenCalledTimes(1);
    expect(redis.del).toHaveBeenCalledWith('igdb:token');
    expect(err).toBeInstanceOf(IgdbError);
    expect((err as IgdbError).statusCode).toBe(502);
  });

  it('retries once after 401 and returns the game when the second response is 200', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse(null, 401), mockResponse([RAW_GAME]));

    const [game] = await client.searchGames('test');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(redis.del).toHaveBeenCalledWith('igdb:token');
    expect(game).toEqual({
      igdbId: 1942,
      name: 'The Witcher 3: Wild Hunt',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg',
      releaseYear: 2015,
      platforms: ['PC (Microsoft Windows)', 'PlayStation 4'],
      genres: ['RPG', 'Aventura'],
      summary: 'A story-driven open world RPG.',
    });
  });

  it('maps upstream access denial to 502', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse(null, 403));

    await expect(client.searchGames('test')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('throws IgdbError on IGDB 5xx', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    setupFetch(mockResponse(null, 503));

    await expect(client.searchGames('test')).rejects.toThrow(IgdbError);
  });

  it('throws IgdbError with statusCode 504 on AbortError (timeout)', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));

    const err = await client.searchGames('test').catch((e) => e);

    expect(err).toBeInstanceOf(IgdbError);
    expect(err.statusCode).toBe(504);
  });

  it('throws IgdbError with statusCode 502 on generic network failure', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const err = await client.searchGames('test').catch((e) => e);

    expect(err).toBeInstanceOf(IgdbError);
    expect(err.statusCode).toBe(502);
  });
});

describe('IgdbClient — platform catalog', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('paginates, deduplicates, sorts canonical names and caches the catalog', async () => {
    const redis = makeRedis({ get: vi.fn().mockResolvedValue(TOKEN) });
    // Platform cache is distinct from the OAuth token.
    redis.get.mockImplementation(async (key: string) => (key === 'igdb:token' ? TOKEN : null));
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(
      mockResponse(Array.from({ length: 500 }, () => ({ name: 'Zeta' }))),
      mockResponse([{ name: 'Alpha' }]),
    );
    await expect(client.getPlatforms()).resolves.toEqual(['Alpha', 'Zeta']);
    expect(fetchMock.mock.calls[1][1].body).toContain('offset 500');
    expect(redis.set).toHaveBeenCalledWith('igdb:v1:platforms', '["Alpha","Zeta"]', { EX: 86400 });
  });
  it('shares concurrent catalog calls and bounds pagination without caching partial results', async () => {
    const redis = makeRedis({
      get: vi.fn().mockImplementation(async (key: string) => (key === 'igdb:token' ? TOKEN : null)),
    });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(mockResponse(Array.from({ length: 500 }, () => ({ name: 'Alpha' }))));
    vi.stubGlobal('fetch', fetchMock);
    const results = await Promise.allSettled([client.getPlatforms(), client.getPlatforms()]);
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(redis.set).not.toHaveBeenCalled();
  });
  it('uses a validated catalog cache without network', async () => {
    const client = new IgdbClient(
      makeRedis({ get: vi.fn().mockResolvedValue('["Alpha"]') }),
      CLIENT_ID,
      CLIENT_SECRET,
    );
    const fetchMock = setupFetch();
    await expect(client.getPlatforms()).resolves.toEqual(['Alpha']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('IgdbClient — Steam matching', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('discovers the current Steam source and matches exact app IDs, leaving ambiguity unresolved', async () => {
    const redis = makeRedis({
      get: vi.fn().mockImplementation(async (key: string) => (key === 'igdb:token' ? TOKEN : null)),
    });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(
      mockResponse([{ id: 77, name: 'Steam' }]),
      mockResponse([
        { uid: '10', game: RAW_GAME },
        { uid: '10', game: RAW_GAME },
        { uid: '20', game: { ...RAW_GAME, id: 99 } },
        { uid: '20', game: { ...RAW_GAME, id: 100 } },
      ]),
    );
    const matches = await client.matchSteamGames([10, 20, 30]);
    expect(matches.get(10)?.igdbId).toBe(RAW_GAME.id);
    expect(matches.get(20)).toBeNull();
    expect(matches.get(30)).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.igdb.com/v4/external_game_sources');
    expect(fetchMock.mock.calls[1][1].body).toContain('external_game_source = 77');
    expect(fetchMock.mock.calls[1][1].body).not.toContain('category');
    expect(redis.set).toHaveBeenCalledWith('igdb:v1:steam-source', '77', { EX: 86400 });
  });
  it('reuses a validated source cache and makes no request for an empty page', async () => {
    const redis = makeRedis({
      get: vi
        .fn()
        .mockImplementation(async (key: string) =>
          key === 'igdb:token' ? TOKEN : key === 'igdb:v1:steam-source' ? '77' : null,
        ),
    });
    const client = new IgdbClient(redis, CLIENT_ID, CLIENT_SECRET);
    const fetchMock = setupFetch(mockResponse([]));
    expect((await client.matchSteamGames([])).size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await client.matchSteamGames([10])).get(10)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
