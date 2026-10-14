import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { ChecklistItemRepository } from './checklist-item.repository.js';
import {
  checklistItemResponseSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
} from './checklist-item.schema.js';
import { ChecklistItemService } from './checklist-item.service.js';

const entryParam = z.object({ id: z.string().min(1).max(100) });
const itemParam = entryParam.extend({ itemId: z.string().min(1).max(100) });
export async function checklistItemRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new ChecklistItemService(new ChecklistItemRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['checklist'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/:id/checklist', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      response: { 200: z.object({ items: z.array(checklistItemResponseSchema) }) },
    },
    handler: async (req) => ({ items: await service.list(req.params.id, req.userId) }),
  });
  routes.post('/library/:id/checklist', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      body: createChecklistItemSchema,
      response: { 201: checklistItemResponseSchema },
    },
    handler: async (req, reply) =>
      reply.code(201).send(await service.create(req.params.id, req.userId, req.body)),
  });
  routes.patch('/library/:id/checklist/:itemId', {
    ...opts,
    schema: {
      ...opts.schema,
      params: itemParam,
      body: updateChecklistItemSchema,
      response: { 200: checklistItemResponseSchema },
    },
    handler: async (req) => service.update(req.params.itemId, req.params.id, req.userId, req.body),
  });
  routes.delete('/library/:id/checklist/:itemId', {
    ...opts,
    schema: { ...opts.schema, params: itemParam, response: { 204: z.null() } },
    handler: async (req, reply) => {
      await service.remove(req.params.itemId, req.params.id, req.userId);
      return reply.code(204).send(null);
    },
  });
}
