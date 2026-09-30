import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { isDatabaseAsleep, mapDatabaseUnavailable, withDatabaseRetry } from '@/lib/databaseWake.js';
import errorHandler from '@/plugins/errorHandler.js';

function connectionError(code: string, message = 'Connection terminated unexpectedly') {
  return Object.assign(new Error(message), { code });
}

describe('isDatabaseAsleep', () => {
  it('recognizes a dropped connection and a postgres shutdown', () => {
    expect(isDatabaseAsleep(connectionError('ECONNRESET'))).toBe(true);
    expect(
      isDatabaseAsleep(
        connectionError('57P01', 'terminating connection due to administrator command'),
      ),
    ).toBe(true);
    expect(isDatabaseAsleep(new Error('Connection terminated unexpectedly'))).toBe(true);
  });

  it('recognizes a driver adapter wake error wrapped as cause', () => {
    const wrapped = new Error('query failed', { cause: { kind: 'ConnectionClosed' } });
    expect(isDatabaseAsleep(wrapped)).toBe(true);
    expect(
      isDatabaseAsleep({
        cause: {
          kind: 'postgres',
          code: '57P03',
          message: 'the database system is starting up',
          severity: 'FATAL',
        },
      }),
    ).toBe(true);
  });

  it('ignores constraint errors and ordinary failures', () => {
    expect(isDatabaseAsleep(connectionError('P2002', 'Unique constraint failed'))).toBe(false);
    expect(isDatabaseAsleep(new Error('Credenciais inválidas'))).toBe(false);
    expect(isDatabaseAsleep(new Error('boom'))).toBe(false);
  });
});

describe('withDatabaseRetry', () => {
  it('retries a waking database and returns the later success', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(connectionError('ECONNRESET'))
      .mockRejectedValueOnce(new Error('Connection terminated unexpectedly'))
      .mockResolvedValueOnce('ok');

    await expect(withDatabaseRetry(run, { delaysMs: [0, 0, 0] })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does not retry a query error', async () => {
    const run = vi.fn().mockRejectedValue(new Error('invalid input'));

    await expect(withDatabaseRetry(run, { delaysMs: [0, 0] })).rejects.toThrow('invalid input');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('stops after the last delay', async () => {
    const run = vi.fn().mockRejectedValue(connectionError('ECONNRESET'));

    await expect(withDatabaseRetry(run, { delaysMs: [0, 0] })).rejects.toMatchObject({
      code: 'ECONNRESET',
    });
    expect(run).toHaveBeenCalledTimes(3);
  });
});

describe('database unavailable response', () => {
  it('maps an exhausted wake failure to 503', () => {
    expect(mapDatabaseUnavailable(connectionError('ECONNRESET'))).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      statusCode: 503,
    });
    expect(mapDatabaseUnavailable(new Error('invalid input'))).toBeNull();
  });

  it('answers the request with the wake message instead of an internal error', async () => {
    const app = Fastify();
    await app.register(errorHandler);
    app.post('/login', async () => {
      throw connectionError('ECONNRESET');
    });

    const res = await app.inject({ method: 'POST', url: '/login' });

    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      message: 'O banco está acordando. Espere alguns segundos e tente de novo.',
    });
    await app.close();
  });
});
