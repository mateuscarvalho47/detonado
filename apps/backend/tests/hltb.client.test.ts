import { HowLongToBeatService } from 'howlongtobeat-ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HltbClient } from '@/lib/hltb/client.js';

const TIMES = { mainHours: 27, mainExtraHours: 40, completionistHours: null };

function makeRedis(cached: string | null = null) {
  return {
    get: vi.fn().mockResolvedValue(cached),
    set: vi.fn().mockResolvedValue('OK'),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HltbClient', () => {
  it('reports an HTTP failure without caching it as a miss', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const redis = makeRedis();
    const logger = { warn: vi.fn() };
    const client = new HltbClient(redis, 5000, logger);

    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'FAILED' });
    expect(redis.set).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hollow Knight', kind: 'http', status: 404 }),
      'HLTB lookup failed',
    );
  });

  it('cancels the transport when the deadline expires', async () => {
    let aborted = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_, reject) => {
            const abort = () => {
              aborted = true;
              reject(init.signal?.reason);
            };
            if (init.signal?.aborted) abort();
            else init.signal?.addEventListener('abort', abort, { once: true });
          }),
      ),
    );
    const redis = makeRedis();
    const client = new HltbClient(redis, 20);

    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'FAILED' });
    expect(aborted).toBe(true);
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('caches a successful empty search as a miss for one hour', async () => {
    vi.spyOn(HowLongToBeatService.prototype, 'search').mockResolvedValue({
      success: true,
      data: [],
    });
    const redis = makeRedis();
    const client = new HltbClient(redis);

    expect(await client.findByName('Unknown Game')).toEqual({ status: 'MISS' });
    expect(redis.set).toHaveBeenCalledWith(
      'hltb:v2:name:unknown game',
      JSON.stringify({ status: 'MISS' }),
      { EX: 3600 },
    );
  });

  it('converts seconds to hours and caches a match for a day', async () => {
    const search = vi.spyOn(HowLongToBeatService.prototype, 'search').mockResolvedValue({
      success: true,
      data: [{ mainTime: 97200, mainExtraTime: 144000 } as never],
    });
    const redis = makeRedis();
    const client = new HltbClient(redis);

    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'FOUND', times: TIMES });
    expect(search).toHaveBeenCalledWith('Hollow Knight', { signal: expect.any(AbortSignal) });
    expect(redis.set).toHaveBeenCalledWith(
      'hltb:v2:name:hollow knight',
      JSON.stringify({ status: 'FOUND', times: TIMES }),
      { EX: 86400 },
    );
  });

  it('returns a validated cache hit without calling the provider', async () => {
    const search = vi.spyOn(HowLongToBeatService.prototype, 'search');
    const client = new HltbClient(makeRedis(JSON.stringify({ status: 'FOUND', times: TIMES })));

    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'FOUND', times: TIMES });
    expect(search).not.toHaveBeenCalled();
  });

  it('fetches again when cached JSON is corrupt', async () => {
    const search = vi
      .spyOn(HowLongToBeatService.prototype, 'search')
      .mockResolvedValue({ success: true, data: [] });
    const client = new HltbClient(makeRedis('{broken'));

    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'MISS' });
    expect(search).toHaveBeenCalledOnce();
  });

  it('shares simultaneous refreshes and releases the pending lookup afterwards', async () => {
    const search = vi
      .spyOn(HowLongToBeatService.prototype, 'search')
      .mockResolvedValue({ success: false, error: 'Unavailable', kind: 'http', status: 503 });
    const redis = makeRedis(JSON.stringify({ status: 'FOUND', times: TIMES }));
    const client = new HltbClient(redis);

    const results = await Promise.all([
      client.findByName('Hollow Knight', { fresh: true }),
      client.findByName('hollow knight', { fresh: true }),
    ]);
    expect(results).toEqual([{ status: 'FAILED' }, { status: 'FAILED' }]);
    expect(search).toHaveBeenCalledOnce();
    expect(redis.set).not.toHaveBeenCalled();

    await client.findByName('Hollow Knight', { fresh: true });
    expect(search).toHaveBeenCalledTimes(2);
    expect(await client.findByName('Hollow Knight')).toEqual({ status: 'FOUND', times: TIMES });
  });
});
