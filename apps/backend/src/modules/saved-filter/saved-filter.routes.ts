import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { SavedFilterRepository } from './saved-filter.repository.js';
import {
  createSavedFilterSchema,
  savedFilterResponseSchema,
  updateSavedFilterSchema,
} from './saved-filter.schema.js';
import { SavedFilterService } from './saved-filter.service.js';

const idParam = z.object({ id: z.string().min(1).max(100) });

export async function savedFilterRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new SavedFilterService(new SavedFilterRepository(app.prisma));
  const protectedRoute = {
    preHandler: requireAuth,
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
    schema: { tags: ['saved-filter'], security: [{ sessionCookie: [] }] },
  };

  routes.get('/library/filters', {
    ...protectedRoute,
    schema: {
      ...protectedRoute.schema,
      response: { 200: z.object({ filters: z.array(savedFilterResponseSchema) }) },
    },
    handler: async (request) => ({ filters: await service.list(request.userId) }),
  });
  routes.get('/library/filters/:id', {
    ...protectedRoute,
    schema: {
      ...protectedRoute.schema,
      params: idParam,
      response: { 200: savedFilterResponseSchema },
    },
    handler: async (request) => service.getById(request.params.id, request.userId),
  });
  routes.post('/library/filters', {
    ...protectedRoute,
    schema: {
      ...protectedRoute.schema,
      body: createSavedFilterSchema,
      response: { 201: savedFilterResponseSchema },
    },
    handler: async (request, reply) => {
      const record = await service.create(request.userId, request.body);
      return reply.code(201).send(record);
    },
  });
  routes.patch('/library/filters/:id', {
    ...protectedRoute,
    schema: {
      ...protectedRoute.schema,
      params: idParam,
      body: updateSavedFilterSchema,
      response: { 200: savedFilterResponseSchema },
    },
    handler: async (request) => service.update(request.params.id, request.userId, request.body),
  });
  routes.delete('/library/filters/:id', {
    ...protectedRoute,
    schema: { ...protectedRoute.schema, params: idParam, response: { 204: z.null() } },
    handler: async (request, reply) => {
      await service.remove(request.params.id, request.userId);
      return reply.code(204).send(null);
    },
  });
}
