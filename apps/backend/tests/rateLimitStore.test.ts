import { describe, expect, it, vi } from 'vitest';
import { createRedisRateLimitStore } from '@/lib/rateLimitStore.js';

function callbackResult(
  store: {
    incr: (
      key: string,
      callback: (error: Error | null, result?: { current: number; ttl: number }) => void,
      timeWindow: number,
      max: number,
    ) => void;
  },
  key: string,
) {
  return new Promise<{ current: number; ttl: number }>((resolve, reject) => {
    store.incr(
      key,
      (error: Error | null, result?: { current: number; ttl: number }) => {
        if (error || !result) reject(error ?? new Error('missing result'));
        else resolve(result);
      },
      60_000,
      5,
    );
  });
}

describe('createRedisRateLimitStore', () => {
  it('runs the script under the detonado prefix', async () => {
    const evalMock = vi.fn().mockResolvedValue([2, 60_000]);
    const Store = createRedisRateLimitStore({ eval: evalMock }, 'detonado-rl:');
    const store = new Store();

    await expect(callbackResult(store, '127.0.0.1')).resolves.toEqual({ current: 2, ttl: 60_000 });
    expect(evalMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        keys: ['detonado-rl:127.0.0.1'],
        arguments: ['60000', '5', 'false', 'false'],
      }),
    );
  });

  it('gives each route its own prefix', async () => {
    const evalMock = vi.fn().mockResolvedValue([1, 1000]);
    const Store = createRedisRateLimitStore({ eval: evalMock });
    const child = new Store().child({ routeInfo: { method: 'POST', url: '/api/auth/login' } });

    await callbackResult(child, '10.0.0.1');
    expect(evalMock.mock.calls[0][1].keys).toEqual(['detonado-rl:POST/api/auth/login-10.0.0.1']);
  });

  it('reports a script failure to the callback', async () => {
    const evalMock = vi.fn().mockResolvedValue('nope');
    const Store = createRedisRateLimitStore({ eval: evalMock });
    await expect(callbackResult(new Store(), '1')).rejects.toThrow(/unexpected value/);
  });
});
