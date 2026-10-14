import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { JournalEntryRepository } from './journal-entry.repository.js';
import {
  createJournalEntrySchema,
  journalEntryResponseSchema,
  updateJournalEntrySchema,
} from './journal-entry.schema.js';
import { JournalEntryService } from './journal-entry.service.js';

const entryParam = z.object({ id: z.string().min(1).max(100) });
const journalParam = entryParam.extend({ journalId: z.string().min(1).max(100) });
export async function journalEntryRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new JournalEntryService(new JournalEntryRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['journal'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/:id/journal', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      querystring: z.object({ campaignId: z.string().min(1).max(100).optional() }),
      response: { 200: z.object({ entries: z.array(journalEntryResponseSchema) }) },
    },
    handler: async (req) => ({
      entries: await service.list(req.params.id, req.userId, req.query.campaignId),
    }),
  });
  routes.post('/library/:id/journal', {
    ...opts,
    schema: {
      ...opts.schema,
      params: entryParam,
      body: createJournalEntrySchema,
      response: { 201: journalEntryResponseSchema },
    },
    handler: async (req, reply) =>
      reply.code(201).send(await service.create(req.params.id, req.userId, req.body)),
  });
  routes.patch('/library/:id/journal/:journalId', {
    ...opts,
    schema: {
      ...opts.schema,
      params: journalParam,
      body: updateJournalEntrySchema,
      response: { 200: journalEntryResponseSchema },
    },
    handler: async (req) =>
      service.update(req.params.journalId, req.params.id, req.userId, req.body),
  });
  routes.delete('/library/:id/journal/:journalId', {
    ...opts,
    schema: { ...opts.schema, params: journalParam, response: { 204: z.null() } },
    handler: async (req, reply) => {
      await service.remove(req.params.journalId, req.params.id, req.userId);
      return reply.code(204).send(null);
    },
  });
}
