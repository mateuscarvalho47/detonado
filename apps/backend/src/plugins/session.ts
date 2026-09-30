import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { RedisStore } from 'connect-redis';
import fp from 'fastify-plugin';
import { env } from '@/config/env.js';
import { sessionCookie } from '@/plugins/sessionCookie.js';

declare module 'fastify' {
  interface Session {
    userId?: string;
    sessionVersion?: number;
    csrfToken?: string;
  }
}

export default fp(async (app) => {
  if (env.NODE_ENV === 'production' && env.TRUST_PROXY === false) {
    app.log.warn(
      'TRUST_PROXY is false in production. Session cookies fall back to SameSite=Lax and rate limits see the proxy address. Set TRUST_PROXY=1.',
    );
  }

  await app.register(fastifyCookie, { secret: env.COOKIE_SECRET });

  await app.register(fastifySession, {
    secret: env.SESSION_SECRET,
    rolling: true,
    store: new RedisStore({ client: app.redis, prefix: 'sess:' }),
    cookie: sessionCookie(env.NODE_ENV),
    saveUninitialized: false,
  });
});
