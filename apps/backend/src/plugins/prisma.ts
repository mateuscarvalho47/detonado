import { PrismaPg } from '@prisma/adapter-pg';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Pool, type PoolConfig } from 'pg';
import { env } from '@/config/env.js';
import { PrismaClient } from '@/generated/prisma/client.js';
import { withDatabaseRetry } from '@/lib/databaseWake.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

function isSubmittable(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { submit?: unknown }).submit === 'function'
  );
}

// Hosted Postgres can suspend when idle. The first checkout then fails fast
// while the compute wakes; a short retry uses a fresh connection.
function retryWakeups(pool: Pool, onRetry: (err: unknown) => void) {
  const query = pool.query.bind(pool) as (...args: unknown[]) => unknown;
  const connect = pool.connect.bind(pool) as Pool['connect'];

  pool.query = ((...args: unknown[]) => {
    const last = args[args.length - 1];
    if (typeof last === 'function' || (args.length === 1 && isSubmittable(args[0]))) {
      return query(...args);
    }
    return withDatabaseRetry(() => query(...args) as Promise<unknown>, { onRetry });
  }) as Pool['query'];

  pool.connect = ((callback?: Parameters<Pool['connect']>[0]) => {
    if (typeof callback === 'function') return connect(callback);
    return withDatabaseRetry(() => connect() as Promise<unknown>, { onRetry });
  }) as Pool['connect'];
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
  retryWakeups(pool, (err) => {
    app.log.warn({ err }, 'database connection dropped while the server was waking, retrying');
  });

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
