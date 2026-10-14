import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  STEAM_AUTHORIZATION_VERSION,
  SteamAuthorization,
} from '@/modules/steam/steam.authorization.js';
import { steamCache } from './steam.fixtures.js';

afterEach(() => vi.useRealTimers());
describe('session-scoped Steam authorization', () => {
  it('requires the current explanation and isolates users and independent sessions', async () => {
    const authorization = new SteamAuthorization(steamCache());
    await expect(authorization.grant('owner')).rejects.toMatchObject({ statusCode: 403 });
    await expect(authorization.grant('owner', 'outdated')).rejects.toThrow();
    const token = await authorization.grant('owner', STEAM_AUTHORIZATION_VERSION);
    const second = await authorization.grant('owner', STEAM_AUTHORIZATION_VERSION);
    expect(await authorization.active('other', token)).toBe(false);
    await authorization.revoke(token);
    // A late session response containing the old token cannot undo the revocation.
    await expect(authorization.require('owner', token)).rejects.toThrow();
    expect(await authorization.active('owner', second)).toBe(true);
  });
  it('expires after seven days and rejects malformed cache data', async () => {
    vi.useFakeTimers();
    const cache = steamCache();
    const authorization = new SteamAuthorization(cache);
    const token = await authorization.grant('owner', STEAM_AUTHORIZATION_VERSION);
    expect(await authorization.active('owner', token)).toBe(true);
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);
    expect(await authorization.active('owner', token)).toBe(false);
    await cache.set(`steam:authorization:${token}`, 'invalid JSON');
    expect(await authorization.active('owner', token)).toBe(false);
  });
});
