import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Fastify, { type LightMyRequestResponse } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { describe, expect, it, vi } from 'vitest';
import { sendVerificationEmail } from '@/lib/email.js';
import { authRoutes } from '@/modules/auth/auth.routes.js';
import csrf from '@/plugins/csrf.js';
import errorHandler from '@/plugins/errorHandler.js';

vi.mock('@/lib/email.js', () => ({ sendVerificationEmail: vi.fn().mockResolvedValue(undefined) }));

function sessionCookie(response: LightMyRequestResponse) {
  const value = response.headers['set-cookie'];
  const cookie = Array.isArray(value) ? value[0] : value;
  return String(cookie).split(';')[0];
}

describe('authentication HTTP flow', () => {
  it('registers, verifies, rotates session/CSRF on login and destroys the session on logout', async () => {
    vi.mocked(sendVerificationEmail).mockClear();
    let user: Record<string, unknown> | null = null;
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', {
      user: {
        findUnique: vi.fn(async () => user),
        create: vi.fn(async ({ data }) => {
          user = {
            ...data,
            id: 'user-1',
            emailVerified: false,
            sessionVersion: 0,
            createdAt: new Date(),
          };
          return user;
        }),
        updateMany: vi.fn(async ({ where, data }) => {
          if (
            !user ||
            user.emailVerificationToken !== where.emailVerificationToken ||
            user.emailVerified
          ) {
            return { count: 0 };
          }
          Object.assign(user, data);
          return { count: 1 };
        }),
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
    await app.register(authRoutes, { prefix: '/api' });

    try {
      const initialCsrf = await app.inject({ method: 'GET', url: '/api/auth/csrf' });
      const initialCookie = sessionCookie(initialCsrf);
      const initialToken = initialCsrf.json().token;
      const headers = { cookie: initialCookie, 'x-csrf-token': initialToken };
      const registered = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        headers,
        payload: { email: 'test@example.com', password: 'password123', consent: true },
      });
      expect(registered.statusCode).toBe(201);

      const rawToken = vi.mocked(sendVerificationEmail).mock.calls[0][1];
      const verified = await app.inject({
        method: 'GET',
        url: `/api/auth/verify-email?token=${rawToken}`,
      });
      expect(verified.statusCode).toBe(200);
      const replay = await app.inject({
        method: 'GET',
        url: `/api/auth/verify-email?token=${rawToken}`,
      });
      expect(replay.statusCode).toBe(404);

      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        headers,
        payload: { email: 'test@example.com', password: 'password123' },
      });
      expect(login.statusCode).toBe(200);
      const loggedInCookie = sessionCookie(login);
      expect(loggedInCookie).not.toBe(initialCookie);

      const rejected = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { cookie: loggedInCookie, 'x-csrf-token': initialToken },
      });
      expect(rejected.statusCode).toBe(403);
      const nextCsrf = await app.inject({
        method: 'GET',
        url: '/api/auth/csrf',
        headers: { cookie: loggedInCookie },
      });
      expect(nextCsrf.json().token).not.toBe(initialToken);
      const logout = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { cookie: loggedInCookie, 'x-csrf-token': nextCsrf.json().token },
      });
      expect(logout.statusCode).toBe(204);
      const me = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie: loggedInCookie },
      });
      expect(me.statusCode).toBe(401);
    } finally {
      await app.close();
    }
  });
});
