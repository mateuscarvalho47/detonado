import fastifyRateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { createRedisRateLimitStore } from '@/lib/rateLimitStore.js';

export default fp(async (app) => {
  await app.register(fastifyRateLimit, {
    global: false,
    // The built-in redis option calls ioredis defineCommand. This client is node-redis.
    store: createRedisRateLimitStore(
      app.redis,
      'detonado-rl:',
    ) as unknown as fastifyRateLimit.FastifyRateLimitStoreCtor,
  });
});
