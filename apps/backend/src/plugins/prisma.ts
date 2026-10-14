import { PrismaPg } from '@prisma/adapter-pg';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Pool, type PoolConfig } from 'pg';
import { env } from '@/config/env.js';
import { PrismaClient } from '@/generated/prisma/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app: FastifyInstance) => {
  const config: PoolConfig = {
    connectionString: env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  };
  const pool = new Pool(config);

  const adapter = new PrismaPg(pool, {
    disposeExternalPool: true,
    onPoolError(err) {
      app.log.warn({ err }, 'idle database connection closed');
    },
  });
  const prisma = new PrismaClient({ adapter });

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
