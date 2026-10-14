import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { OrganizationRepository } from './organization.repository.js';
import {
  organizationNameSchema,
  organizationResponseSchema,
  updateOrganizationSchema,
} from './organization.schema.js';
import { OrganizationService } from './organization.service.js';

const idParam = z.object({ id: z.string().min(1).max(100) });
export async function organizationRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new OrganizationService(new OrganizationRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['organization'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  for (const kind of ['collections', 'tags'] as const) {
    const response =
      kind === 'collections'
        ? z.object({ collections: z.array(organizationResponseSchema) })
        : z.object({ tags: z.array(organizationResponseSchema) });
    routes.get(`/library/${kind}`, {
      ...opts,
      schema: { ...opts.schema, response: { 200: response } },
      handler: async (req) => {
        const rows = await service.list(kind, req.userId);
        return kind === 'collections' ? { collections: rows } : { tags: rows };
      },
    });
    routes.post(`/library/${kind}`, {
      ...opts,
      schema: {
        ...opts.schema,
        body: organizationNameSchema,
        response: { 201: organizationResponseSchema },
      },
      handler: async (req, reply) =>
        reply.code(201).send(await service.create(kind, req.userId, req.body)),
    });
    routes.patch(`/library/${kind}/:id`, {
      ...opts,
      schema: {
        ...opts.schema,
        params: idParam,
        body: organizationNameSchema,
        response: { 200: organizationResponseSchema },
      },
      handler: async (req) => service.update(kind, req.params.id, req.userId, req.body),
    });
    routes.delete(`/library/${kind}/:id`, {
      ...opts,
      schema: { ...opts.schema, params: idParam, response: { 204: z.null() } },
      handler: async (req, reply) => {
        await service.remove(kind, req.params.id, req.userId);
        return reply.code(204).send(null);
      },
    });
  }
  routes.patch('/library/:id/organization', {
    ...opts,
    schema: {
      ...opts.schema,
      params: idParam,
      body: updateOrganizationSchema,
      response: { 200: updateOrganizationSchema },
    },
    handler: async (req) => service.replace(req.params.id, req.userId, req.body),
  });
}
