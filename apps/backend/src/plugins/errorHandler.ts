import fp from 'fastify-plugin';
import { ZodError, z } from 'zod';
import { mapDatabaseUnavailable } from '@/lib/databaseWake.js';
import { AppError, ValidationError } from '@/lib/errors.js';
import { mapPrismaWriteError } from '@/lib/prismaErrors.js';

export default fp(async (app) => {
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      const e = new ValidationError(z.treeifyError(err));
      return reply.code(e.statusCode).send({
        error: { code: e.code, message: e.message, details: e.details },
      });
    }

    const appError =
      err instanceof AppError ? err : (mapPrismaWriteError(err) ?? mapDatabaseUnavailable(err));
    if (appError) {
      if (appError.code === 'DATABASE_UNAVAILABLE') {
        req.log.warn({ err }, 'database unavailable');
      }
      return reply.code(appError.statusCode).send({
        error: { code: appError.code, message: appError.message, details: appError.details },
      });
    }

    if (
      err != null &&
      typeof err === 'object' &&
      'statusCode' in err &&
      typeof (err as { statusCode: unknown }).statusCode === 'number' &&
      (err as { statusCode: number }).statusCode < 500
    ) {
      const e = err as { statusCode: number; code?: string; message?: string };
      return reply.code(e.statusCode).send({
        error: { code: e.code ?? 'VALIDATION', message: e.message ?? 'Bad request' },
      });
    }

    req.log.error({ err }, 'unhandled error');
    return reply.code(500).send({
      error: { code: 'INTERNAL', message: 'Erro interno' },
    });
  });
});
