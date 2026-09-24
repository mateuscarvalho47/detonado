import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { RedisStore } from 'connect-redis';
import fp from 'fastify-plugin';
import { env } from '@/config/env.js';

declare module 'fastify' {
  interface Session {
    userId?: string;
    sessionVersion?: number;
  }
}

export default fp(async (app) => {
  await app.register(fastifyCookie, { secret: env.COOKIE_SECRET });

  await app.register(fastifySession, {
    secret: env.SESSION_SECRET,
    rolling: true,
    store: new RedisStore({ client: app.redis, prefix: 'sess:' }),
    cookie: {
      httpOnly: true,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    saveUninitialized: false,
  });
});
