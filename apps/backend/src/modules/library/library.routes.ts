import { retrospectiveQuerySchema, retrospectiveResponseSchema } from '@detonado/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { GameService } from '@/modules/game/game.service.js';
import { LibraryRepository } from './library.repository.js';
import { RetrospectiveService } from './library.retrospective.service.js';
import {
  createLibraryEntryInput,
  libraryEntrySchema,
  libraryStatsSchema,
  updateLibraryEntryInput,
} from './library.schema.js';
import { LibraryService } from './library.service.js';

const idParam = z.object({ id: z.cuid2() });

export async function libraryRoutes(app: FastifyInstance) {
  const repo = new LibraryRepository(app.prisma);
  const games = new GameService(app.igdb, app.redis, app.hltb);
  const service = new LibraryService(repo, games);
  const retrospective = new RetrospectiveService(repo);
  const routes = app.withTypeProvider<ZodTypeProvider>();

  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['library'], security: [{ sessionCookie: [] }] },
  };

  routes.post('/library', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Adicionar jogo à biblioteca',
      body: createLibraryEntryInput,
      response: { 201: libraryEntrySchema },
    },
    handler: async (req, reply) => {
      const entry = await service.create(req.userId, req.body);
      return reply.code(201).send(entry);
    },
  });

  routes.get('/library', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Listar biblioteca do usuário',
      response: { 200: z.array(libraryEntrySchema) },
    },
    handler: async (req) => service.list(req.userId),
  });

  routes.get('/library/retrospective', {
    ...opts,
    config: {
      rateLimit: {
        hook: 'preHandler',
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
    schema: {
      ...opts.schema,
      summary: 'Retrospecto por período',
      querystring: retrospectiveQuerySchema,
      response: { 200: retrospectiveResponseSchema },
    },
    handler: async (req) => retrospective.get(req.userId, req.query),
  });

  routes.get('/library/stats', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Estatísticas da biblioteca do usuário',
      response: { 200: libraryStatsSchema },
    },
    handler: async (req) => service.getStats(req.userId),
  });

  routes.get('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Buscar entrada da biblioteca',
      params: idParam,
      response: { 200: libraryEntrySchema },
    },
    handler: async (req) => service.getById(req.params.id, req.userId),
  });

  routes.post('/library/:id/queue', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Mover um jogo na fila',
      params: idParam,
      body: z.object({ direction: z.enum(['up', 'down']) }),
      response: { 200: libraryEntrySchema },
    },
    handler: async (req) => service.moveInQueue(req.params.id, req.userId, req.body.direction),
  });

  routes.post('/library/:id/hltb', {
    ...opts,
    config: {
      rateLimit: {
        hook: 'preHandler',
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.session.userId ?? req.ip,
      },
    },
    schema: {
      ...opts.schema,
      summary: 'Buscar de novo os tempos do HowLongToBeat',
      params: idParam,
      response: { 200: libraryEntrySchema },
    },
    handler: async (req) => service.refreshHltb(req.params.id, req.userId),
  });

  routes.patch('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Atualizar entrada da biblioteca',
      params: idParam,
      body: updateLibraryEntryInput,
      response: { 200: libraryEntrySchema },
    },
    handler: async (req) => service.update(req.params.id, req.userId, req.body),
  });

  routes.delete('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Remover jogo da biblioteca',
      params: idParam,
      response: { 204: z.null() },
    },
    handler: async (req, reply) => {
      await service.remove(req.params.id, req.userId);
      return reply.code(204).send(null);
    },
  });
}
