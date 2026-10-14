import { buildApp } from '@/app.js';
import { env } from '@/config/env.js';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (error) {
    app.log.error({ err: error }, 'failed to start server');
    await app.close();
    throw error;
  }

  let closing = false;
  async function shutdown(signal: string) {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'closing server');
    const deadline = setTimeout(() => {
      app.log.error('shutdown deadline exceeded');
      process.exit(1);
    }, 10000);
    deadline.unref();
    try {
      await app.close();
      clearTimeout(deadline);
    } catch (error) {
      app.log.error({ err: error }, 'failed to close server');
      process.exitCode = 1;
    }
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void shutdown(signal);
    });
  }
}

start().catch((error: unknown) => {
  console.error('Backend startup failed:', error);
  process.exitCode = 1;
});
