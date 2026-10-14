import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { GameSourceRepository } from './game-source.repository.js';
import {
  createGameSourceSchema,
  gameSourceResponseSchema,
  updateGameSourceSchema,
} from './game-source.schema.js';
import { GameSourceService } from './game-source.service.js';

const entryParam = z.object({ id: z.string().min(1).max(100) });
const sourceParam = entryParam.extend({ sourceId: z.string().min(1).max(100) });
export async function gameSourceRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new GameSourceService(new GameSourceRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['sources'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/:id/sources', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      response: { 200: z.object({ sources: z.array(gameSourceResponseSchema) }) },
    },
    handler: async (req) => ({ sources: await service.list(req.params.id, req.userId) }),
  });
  routes.post('/library/:id/sources', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      body: createGameSourceSchema,
      response: { 201: gameSourceResponseSchema },
    },
    handler: async (req, reply) =>
      reply.code(201).send(await service.create(req.params.id, req.userId, req.body)),
  });
  routes.patch('/library/:id/sources/:sourceId', {
    ...opts,
    schema: {
      ...opts.schema,
      params: sourceParam,
      body: updateGameSourceSchema,
      response: { 200: gameSourceResponseSchema },
    },
    handler: async (req) =>
      service.update(req.params.sourceId, req.params.id, req.userId, req.body),
  });
  routes.delete('/library/:id/sources/:sourceId', {
    ...opts,
    schema: { ...opts.schema, params: sourceParam, response: { 204: z.null() } },
    handler: async (req, reply) => {
      await service.remove(req.params.sourceId, req.params.id, req.userId);
      return reply.code(204).send(null);
    },
  });
}
