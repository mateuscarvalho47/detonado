import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { steamRoutes } from '@/modules/steam/steam.routes.js';
import csrf from '@/plugins/csrf.js';
import errorHandler from '@/plugins/errorHandler.js';
import {
  STEAM_DISCOVERY,
  STEAM_TEST_ID,
  STEAM_TEST_KEY,
  steamAssertion,
  steamCache,
} from './steam.fixtures.js';

afterEach(() => vi.unstubAllGlobals());
async function appWithSteam(key?: string) {
  const app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  const game = {
    igdbId: 42,
    name: 'Matched game',
    platforms: ['PC (Microsoft Windows)'],
    genres: ['RPG'],
  };
  const matches = vi.fn().mockResolvedValue(new Map([[10, game]]));
  app.decorate('redis', steamCache() as never);
  app.decorate('igdb', { matchSteamGames: matches } as never);
  app.decorate('prisma', {
    user: { findUnique: vi.fn().mockResolvedValue({ sessionVersion: 0 }) },
    libraryEntry: {
      findMany: vi.fn(async ({ where }) => (where.userId === 'owner' ? [{ igdbId: 42 }] : [])),
    },
  } as never);
  await app.register(errorHandler);
  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: 'test-secret-with-at-least-32-characters',
    saveUninitialized: false,
    cookie: { secure: false },
  });
  await app.register(csrf);
  app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
    req.session.userId = req.params.id;
    req.session.sessionVersion = 0;
    req.session.csrfToken = 'test-csrf';
    return {};
  });
  await app.register(steamRoutes, { prefix: '/api', appUrl: 'https://app.test', steamApiKey: key });
  async function login(user: string) {
    const response = await app.inject({ url: `/test-session/${user}` });
    return {
      cookie: String(response.headers['set-cookie']).split(';')[0],
      'x-csrf-token': 'test-csrf',
    };
  }
  return { app, login, matches };
}
describe('Steam HTTP', () => {
  it('starts without credentials, protects status and answers missing configuration without network', async () => {
    const { app, login } = await appWithSteam();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      expect((await app.inject({ url: '/api/library/steam/status' })).statusCode).toBe(401);
      const headers = await login('owner');
      expect((await app.inject({ url: '/api/library/steam/status', headers })).json()).toEqual({
        configured: false,
        steamId: null,
      });
      for (const endpoint of ['connect', 'preview'])
        expect(
          (
            await app.inject({
              method: 'POST',
              url: `/api/library/steam/${endpoint}`,
              headers,
              payload: {},
            })
          ).statusCode,
        ).toBe(503);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it('requires verified ownership, rejects forged callbacks/replay and previews only the verified session ID', async () => {
    const { app, login, matches } = await appWithSteam(STEAM_TEST_KEY);
    const fetchMock = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes('/IPlayerService/'))
        return new Response(
          JSON.stringify({
            response: {
              game_count: 2,
              games: [
                { appid: 10, name: 'Alpha', playtime_forever: 90 },
                { appid: 20, name: 'Beta', playtime_forever: 30 },
              ],
            },
          }),
        );
      return new Response(init.method === 'POST' ? 'is_valid:true\n' : STEAM_DISCOVERY);
    });
    vi.stubGlobal('fetch', fetchMock);
    try {
      const headers = await login('owner');
      const otherHeaders = await login('other');
      const base = '/api/library/steam';
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/connect`,
            headers: { cookie: headers.cookie },
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (await app.inject({ method: 'POST', url: `${base}/preview`, headers, payload: {} }))
          .statusCode,
      ).toBe(403);
      const connect = await app.inject({
        method: 'POST',
        url: `${base}/connect`,
        headers,
        payload: {},
      });
      expect(connect.statusCode).toBe(200);
      expect(connect.json().url).not.toContain(STEAM_TEST_KEY);
      const assertion = steamAssertion(connect.json().url);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/verify`,
            headers: { cookie: headers.cookie },
            payload: assertion,
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/verify`,
            headers: otherHeaders,
            payload: assertion,
          })
        ).statusCode,
      ).toBe(403);
      const wrongState = steamAssertion(connect.json().url, { steamState: 'a'.repeat(64) });
      expect(
        (await app.inject({ method: 'POST', url: `${base}/verify`, headers, payload: wrongState }))
          .statusCode,
      ).toBe(403);
      const mismatch = steamAssertion(connect.json().url, {
        'openid.identity': 'https://steamcommunity.com/openid/id/11111111111111111',
      });
      expect(
        (await app.inject({ method: 'POST', url: `${base}/verify`, headers, payload: mismatch }))
          .statusCode,
      ).toBe(403);
      const invalidSigFetch = vi
        .fn()
        .mockResolvedValueOnce(new Response(STEAM_DISCOVERY))
        .mockResolvedValueOnce(new Response('is_valid:false\n'));
      vi.stubGlobal('fetch', invalidSigFetch);
      expect(
        (await app.inject({ method: 'POST', url: `${base}/verify`, headers, payload: assertion }))
          .statusCode,
      ).toBe(403);
      vi.stubGlobal('fetch', fetchMock);
      expect(
        (
          await app.inject({ method: 'POST', url: `${base}/verify`, headers, payload: assertion })
        ).json(),
      ).toEqual({ steamId: STEAM_TEST_ID });
      expect(
        (await app.inject({ method: 'POST', url: `${base}/verify`, headers, payload: assertion }))
          .statusCode,
      ).toBe(403);
      expect((await app.inject({ url: `${base}/status`, headers })).json()).toEqual({
        configured: true,
        steamId: STEAM_TEST_ID,
      });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/preview`,
            headers,
            payload: { steamId: '11111111111111111' },
          })
        ).statusCode,
      ).toBe(400);
      const preview = await app.inject({
        method: 'POST',
        url: `${base}/preview`,
        headers,
        payload: { limit: 1, offset: 0 },
      });
      expect(preview.statusCode).toBe(200);
      expect(preview.json()).toMatchObject({
        steamId: STEAM_TEST_ID,
        total: 2,
        hasMore: true,
        rows: [
          { appId: 10, hoursPlayed: 1.5, duplicate: true, userPlatform: 'PC (Microsoft Windows)' },
        ],
      });
      expect(matches).toHaveBeenCalledWith([10]);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/preview`,
            headers,
            payload: { offset: 1, limit: 1 },
          })
        ).json(),
      ).toMatchObject({ hasMore: false, rows: [{ appId: 20, match: null, duplicate: false }] });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/preview`,
            headers: otherHeaders,
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'DELETE',
            url: `${base}/disconnect`,
            headers: { cookie: headers.cookie },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (await app.inject({ method: 'DELETE', url: `${base}/disconnect`, headers })).statusCode,
      ).toBe(204);
      expect(
        (await app.inject({ method: 'POST', url: `${base}/preview`, headers, payload: {} }))
          .statusCode,
      ).toBe(403);
    } finally {
      await app.close();
    }
  });
});
