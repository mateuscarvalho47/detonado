import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { PlaySessionRepository } from './play-session.repository.js';
import {
  createPlaySessionSchema,
  playSessionResponseSchema,
  updatePlaySessionSchema,
} from './play-session.schema.js';
import { PlaySessionService } from './play-session.service.js';

const entryParam = z.object({ id: z.string().min(1).max(100) });
const sessionParam = entryParam.extend({ sessionId: z.string().min(1).max(100) });
export async function playSessionRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new PlaySessionService(new PlaySessionRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['sessions'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/:id/sessions', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      response: { 200: z.object({ sessions: z.array(playSessionResponseSchema) }) },
    },
    handler: async (req) => ({ sessions: await service.list(req.params.id, req.userId) }),
  });
  routes.post('/library/:id/sessions', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      body: createPlaySessionSchema,
      response: { 201: playSessionResponseSchema },
    },
    handler: async (req, reply) =>
      reply.code(201).send(await service.create(req.params.id, req.userId, req.body)),
  });
  routes.patch('/library/:id/sessions/:sessionId', {
    ...opts,
    schema: {
      ...opts.schema,
      params: sessionParam,
      body: updatePlaySessionSchema,
      response: { 200: playSessionResponseSchema },
    },
    handler: async (req) =>
      service.update(req.params.sessionId, req.params.id, req.userId, req.body),
  });
  routes.delete('/library/:id/sessions/:sessionId', {
    ...opts,
    schema: { ...opts.schema, params: sessionParam, response: { 204: z.null() } },
    handler: async (req, reply) => {
      await service.remove(req.params.sessionId, req.params.id, req.userId);
      return reply.code(204).send(null);
    },
  });
}
