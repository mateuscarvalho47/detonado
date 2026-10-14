import { afterEach, describe, expect, it, vi } from 'vitest';
import { SteamClient } from '@/lib/steam/client.js';
import { STEAM_TEST_ID, STEAM_TEST_KEY, steamCache } from './steam.fixtures.js';

afterEach(() => vi.unstubAllGlobals());
describe('Steam provider', () => {
  it('uses a header key, validates payloads, normalizes and caches successful libraries only', async () => {
    const cache = steamCache();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          response: {
            game_count: 2,
            games: [
              { appid: 10, name: 'Zeta', playtime_forever: 90 },
              { appid: 20, name: 'Alpha' },
            ],
          },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const client = new SteamClient(STEAM_TEST_KEY, cache);
    expect(await client.getOwnedGames(STEAM_TEST_ID)).toEqual([
      { appId: 20, name: 'Alpha', minutes: 0 },
      { appId: 10, name: 'Zeta', minutes: 90 },
    ]);
    await client.getOwnedGames(STEAM_TEST_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).not.toContain(STEAM_TEST_KEY);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: { 'x-webapi-key': STEAM_TEST_KEY },
      redirect: 'error',
    });
  });
  it('distinguishes unavailable private details from an explicitly empty library', async () => {
    const cache = steamCache();
    const client = new SteamClient(STEAM_TEST_KEY, cache);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"response":{}}'))
      .mockResolvedValueOnce(new Response('{"response":{"game_count":0}}'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.getOwnedGames(STEAM_TEST_ID)).rejects.toMatchObject({ statusCode: 403 });
    expect(await cache.get(`steam:v1:owned:${STEAM_TEST_ID}`)).toBeNull();
    await expect(client.getOwnedGames(STEAM_TEST_ID)).resolves.toEqual([]);
  });
  it('rejects nonzero counts with empty/incomplete arrays instead of caching an empty library', async () => {
    const cache = steamCache();
    const client = new SteamClient(STEAM_TEST_KEY, cache);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"response":{"game_count":2,"games":[]}}')),
    );
    await expect(client.getOwnedGames(STEAM_TEST_ID)).rejects.toMatchObject({ statusCode: 502 });
    expect(await cache.get(`steam:v1:owned:${STEAM_TEST_ID}`)).toBeNull();
  });
  it('does not leak provider bodies/keys or cache failures, and requires configuration', async () => {
    const cache = steamCache();
    const fetchMock = vi.fn().mockResolvedValue(new Response(STEAM_TEST_KEY, { status: 403 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      new SteamClient(undefined, cache).getOwnedGames(STEAM_TEST_ID),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
    const error = await new SteamClient(STEAM_TEST_KEY, cache)
      .getOwnedGames(STEAM_TEST_ID)
      .catch((value: unknown) => value);
    expect(String(error)).not.toContain(STEAM_TEST_KEY);
    expect(await cache.get(`steam:v1:owned:${STEAM_TEST_ID}`)).toBeNull();
  });
  it('keeps the deadline active while reading the body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => ({
        ok: true,
        status: 200,
        text: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      })),
    );
    await expect(
      new SteamClient(STEAM_TEST_KEY, steamCache(), 10).getOwnedGames(STEAM_TEST_ID),
    ).rejects.toMatchObject({ statusCode: 504 });
  });
});
