import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { gameDetailSchema, gameSearchResultSchema, searchQuerySchema } from './game.schema.js';
import { GameService } from './game.service.js';

const igdbIdParam = z.object({ igdbId: z.coerce.number().int().positive() });

export async function gameRoutes(app: FastifyInstance) {
  const service = new GameService(app.igdb, app.redis, app.hltb);
  const routes = app.withTypeProvider<ZodTypeProvider>();

  routes.get('/games/search', {
    schema: {
      tags: ['games'],
      summary: 'Buscar jogos por nome',
      security: [{ sessionCookie: [] }],
      querystring: searchQuerySchema,
      response: { 200: z.array(gameSearchResultSchema) },
    },
    preHandler: requireAuth,
    config: {
      rateLimit: {
        hook: 'preHandler',
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.session.userId ?? req.ip,
      },
    },
    handler: async (req) => service.search(req.query.q),
  });

  routes.get('/games/:igdbId', {
    schema: {
      tags: ['games'],
      summary: 'Buscar jogo por ID IGDB',
      security: [{ sessionCookie: [] }],
      params: igdbIdParam,
      response: { 200: gameDetailSchema },
    },
    preHandler: requireAuth,
    config: {
      rateLimit: {
        hook: 'preHandler',
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.session.userId ?? req.ip,
      },
    },
    handler: async (req) => service.getById(req.params.igdbId),
  });
}
