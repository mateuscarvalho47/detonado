import { afterEach, describe, expect, it, vi } from 'vitest';
import { SteamOpenId } from '@/lib/steam/openid.js';
import {
  STEAM_DISCOVERY,
  STEAM_TEST_ID,
  STEAM_TEST_KEY,
  steamAssertion,
  steamCache,
} from './steam.fixtures.js';

afterEach(() => vi.unstubAllGlobals());
describe('Steam OpenID', () => {
  it('verifies discovery and signature, consumes state once, and rejects replay', async () => {
    const cache = steamCache();
    const openid = new SteamOpenId(cache, 'https://app.test', STEAM_TEST_KEY);
    const connect = await openid.connect('owner');
    const assertion = steamAssertion(connect.url);
    expect(connect.url).not.toContain(STEAM_TEST_KEY);
    expect(connect.url).not.toContain('owner');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(STEAM_DISCOVERY))
      .mockResolvedValueOnce(new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      openid.verify('owner', connect.state, assertion.parameters, assertion.callbackUrl),
    ).resolves.toBe(STEAM_TEST_ID);
    expect(fetchMock.mock.calls[1][1].body.get('openid.mode')).toBe('check_authentication');
    await expect(
      openid.verify('owner', connect.state, assertion.parameters, assertion.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('rejects another user/session, expired state, unsigned identities and forged endpoints before network', async () => {
    const cache = steamCache();
    const openid = new SteamOpenId(cache, 'https://app.test', STEAM_TEST_KEY);
    const connect = await openid.connect('owner');
    const assertion = steamAssertion(connect.url);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      openid.verify('other', connect.state, assertion.parameters, assertion.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      openid.verify('owner', 'another-session', assertion.parameters, assertion.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
    const invalidClaims: Record<string, string>[] = [
      { 'openid.identity': 'https://steamcommunity.com/openid/id/11111111111111111' },
      { 'openid.op_endpoint': 'https://attacker.test/' },
      { 'openid.signed': 'return_to,response_nonce' },
      { 'openid.return_to': 'https://attacker.test/' },
    ];
    for (const overrides of invalidClaims) {
      const invalid = steamAssertion(connect.url, overrides);
      await expect(
        openid.verify('owner', connect.state, invalid.parameters, invalid.callbackUrl),
      ).rejects.toMatchObject({ statusCode: 403 });
    }
    await cache.set(
      `steam:openid:state:${connect.state}`,
      JSON.stringify({
        userId: 'owner',
        returnTo: assertion.parameters['openid.return_to'],
        createdAt: Date.now() - 601000,
      }),
    );
    await expect(
      openid.verify('owner', connect.state, assertion.parameters, assertion.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects provider signature failures and duplicate nonce acceptance across fresh states', async () => {
    const cache = steamCache();
    const openid = new SteamOpenId(cache, 'https://app.test', STEAM_TEST_KEY);
    const connect = await openid.connect('owner');
    const assertion = steamAssertion(connect.url);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(STEAM_DISCOVERY))
        .mockResolvedValueOnce(new Response('is_valid:false\n')),
    );
    await expect(
      openid.verify('owner', connect.state, assertion.parameters, assertion.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async (_url, init: RequestInit) =>
            new Response(init.method === 'POST' ? 'is_valid:true\n' : STEAM_DISCOVERY),
        ),
    );
    await openid.verify('owner', connect.state, assertion.parameters, assertion.callbackUrl);
    const next = await openid.connect('owner');
    const replay = steamAssertion(next.url, {
      'openid.response_nonce': assertion.parameters['openid.response_nonce'],
    });
    await expect(
      openid.verify('owner', next.state, replay.parameters, replay.callbackUrl),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
