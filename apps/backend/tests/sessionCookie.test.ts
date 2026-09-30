import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { describe, expect, it } from 'vitest';
import { sessionCookie } from '@/plugins/sessionCookie.js';

declare module 'fastify' {
  interface Session {
    csrfToken?: string;
  }
}

const secret = 'x'.repeat(32);

function setCookie(res: LightMyRequestResponse) {
  const value = res.headers['set-cookie'];
  return Array.isArray(value) ? value.join('\n') : String(value ?? '');
}

async function build(nodeEnv: string, trustProxy: boolean | number) {
  const app = Fastify({ trustProxy });
  await app.register(fastifyCookie, { secret });
  await app.register(fastifySession, {
    secret,
    rolling: true,
    saveUninitialized: false,
    cookie: sessionCookie(nodeEnv),
  });
  app.get('/auth/csrf', async (req) => {
    if (!req.session.csrfToken) req.session.csrfToken = 'token-1';
    return { token: req.session.csrfToken };
  });
  app.post('/auth/login', async (req) => ({ csrf: req.session.csrfToken ?? null }));
  return app;
}

async function csrf(app: FastifyInstance, trustForwardedProto: boolean) {
  return app.inject({
    method: 'GET',
    url: '/auth/csrf',
    headers: trustForwardedProto ? { 'x-forwarded-proto': 'https' } : {},
  });
}

describe('session cookie behind a TLS proxy', () => {
  it('still stores the session when the process sees HTTP', async () => {
    const app = await build('production', false);
    const res = await csrf(app, true);
    const cookie = setCookie(res);

    expect(res.statusCode).toBe(200);
    expect(cookie).toMatch(/sessionId=/);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/;\s*Secure/i);

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: {
        'x-forwarded-proto': 'https',
        cookie: cookie.split(';')[0] ?? '',
      },
    });
    expect(login.json()).toEqual({ csrf: 'token-1' });
    await app.close();
  });

  it('keeps SameSite=None and Secure when the proxy hop is trusted', async () => {
    const app = await build('production', 1);
    const res = await csrf(app, true);
    const cookie = setCookie(res);

    expect(cookie).toMatch(/sessionId=/);
    expect(cookie).toMatch(/SameSite=None/i);
    expect(cookie).toMatch(/;\s*Secure/i);
    await app.close();
  });

  it('sets a lax cookie in development', async () => {
    const app = await build('development', false);
    const res = await csrf(app, false);
    const cookie = setCookie(res);

    expect(cookie).toMatch(/sessionId=/);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).not.toMatch(/;\s*Secure/i);
    await app.close();
  });
});
