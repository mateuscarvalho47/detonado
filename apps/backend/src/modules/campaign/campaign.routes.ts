import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { CampaignRepository } from './campaign.repository.js';
import { campaignResponseSchema, createCampaignSchema } from './campaign.schema.js';
import { CampaignService } from './campaign.service.js';

const idParam = z.object({ id: z.string().min(1).max(100) });
export async function campaignRoutes(app: FastifyInstance) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const service = new CampaignService(new CampaignRepository(app.prisma));
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['campaigns'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/:id/campaigns', {
    ...opts,
    schema: {
      ...opts.schema,
      params: idParam,
      response: { 200: z.object({ campaigns: z.array(campaignResponseSchema) }) },
    },
    handler: async (req) => ({ campaigns: await service.list(req.params.id, req.userId) }),
  });
  routes.post('/library/:id/campaigns', {
    ...opts,
    schema: {
      ...opts.schema,
      params: idParam,
      body: createCampaignSchema,
      response: { 201: campaignResponseSchema },
    },
    handler: async (req, reply) =>
      reply.code(201).send(await service.create(req.params.id, req.userId, req.body)),
  });
}
