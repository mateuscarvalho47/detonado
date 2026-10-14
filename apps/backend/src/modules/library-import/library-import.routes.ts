import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { GameService } from '@/modules/game/game.service.js';
import { LibraryRepository } from '@/modules/library/library.repository.js';
import { LibraryService } from '@/modules/library/library.service.js';
import { LibraryImportRepository } from './library-import.repository.js';
import {
  commitImportResponseSchema,
  commitLibraryImportSchema,
  previewImportResponseSchema,
  previewLibraryImportSchema,
} from './library-import.schema.js';
import { LibraryImportService } from './library-import.service.js';
export async function libraryImportRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const library = new LibraryService(
    new LibraryRepository(app.prisma),
    new GameService(app.igdb, app.redis, app.hltb),
  );
  const service = new LibraryImportService(new LibraryImportRepository(app.prisma), library);
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['import'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.post('/library/import/preview', {
    ...opts,
    schema: {
      ...opts.schema,
      body: previewLibraryImportSchema,
      response: { 200: previewImportResponseSchema },
    },
    handler: async (req) => service.preview(req.userId, req.body.rows),
  });
  routes.post('/library/import', {
    ...opts,
    schema: {
      ...opts.schema,
      body: commitLibraryImportSchema,
      response: { 200: commitImportResponseSchema },
    },
    handler: async (req) => service.commit(req.userId, req.body.rows),
  });
}
