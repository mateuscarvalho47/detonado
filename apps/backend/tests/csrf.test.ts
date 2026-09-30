import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import csrfPlugin, { csrfTokensMatch } from '@/plugins/csrf.js';
import errorHandler from '@/plugins/errorHandler.js';

describe('csrfTokensMatch', () => {
  it('accepts the session token', () => {
    expect(csrfTokensMatch('abc123', 'abc123')).toBe(true);
  });

  it('rejects a missing, empty, or different token', () => {
    expect(csrfTokensMatch(undefined, 'abc123')).toBe(false);
    expect(csrfTokensMatch('abc123', undefined)).toBe(false);
    expect(csrfTokensMatch('abc123', ['abc123'])).toBe(false);
    expect(csrfTokensMatch('abc123', 'abc124')).toBe(false);
    expect(csrfTokensMatch('abc', 'abcd')).toBe(false);
    expect(csrfTokensMatch('', '')).toBe(false);
  });
});

describe('csrf plugin', () => {
  async function build(token: string) {
    const app = Fastify();
    app.addHook('onRequest', async (req) => {
      Object.defineProperty(req, 'session', {
        value: { csrfToken: token },
        configurable: true,
      });
    });
    await app.register(errorHandler);
    await app.register(csrfPlugin);
    app.get('/read', async () => ({ ok: true }));
    app.post('/mutate', async () => ({ ok: true }));
    return app;
  }

  it('rejects a mutating request with a distinct csrf code', async () => {
    const app = await build('token');
    const res = await app.inject({
      method: 'POST',
      url: '/mutate',
      headers: { 'x-csrf-token': 'other' },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toMatchObject({ error: { code: 'CSRF_INVALID' } });
    await app.close();
  });

  it('allows the mutation when the header matches, and ignores GET', async () => {
    const app = await build('token');
    const read = await app.inject({ method: 'GET', url: '/read' });
    const write = await app.inject({
      method: 'POST',
      url: '/mutate',
      headers: { 'x-csrf-token': 'token' },
    });
    expect(read.statusCode).toBe(200);
    expect(write.statusCode).toBe(200);
    await app.close();
  });
});
