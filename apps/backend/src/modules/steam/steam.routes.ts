import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { SteamClient } from '@/lib/steam/client.js';
import { requireSteamKey } from '@/lib/steam/http.js';
import { SteamOpenId } from '@/lib/steam/openid.js';
import { SteamAuthorization } from './steam.authorization.js';
import { SteamRepository } from './steam.repository.js';
import {
  steamPreviewResponseSchema,
  steamPreviewSchema,
  steamStatusSchema,
  steamVerifySchema,
} from './steam.schema.js';
import { SteamService } from './steam.service.js';
export interface SteamRouteOptions {
  appUrl: string;
  steamApiKey?: string;
}
export async function steamRoutes(app: FastifyInstance, options: SteamRouteOptions) {
  const routes = app.withTypeProvider<ZodTypeProvider>();
  const authorization = new SteamAuthorization(app.redis);
  const openid = new SteamOpenId(app.redis, options.appUrl, options.steamApiKey);
  const service = new SteamService(
    new SteamClient(options.steamApiKey, app.redis),
    app.igdb,
    new SteamRepository(app.prisma),
    options.steamApiKey,
  );
  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['steam'], security: [{ sessionCookie: [] }] },
    config: {
      rateLimit: {
        hook: 'preHandler' as const,
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req: FastifyRequest) => req.session.userId ?? req.ip,
      },
    },
  };
  routes.get('/library/steam/status', {
    ...opts,
    schema: { ...opts.schema, response: { 200: steamStatusSchema } },
    handler: async (req) => ({
      configured: Boolean(options.steamApiKey),
      steamId: (await authorization.active(req.userId, req.session.steamAuthorizationToken))
        ? (req.session.steamVerifiedId ?? null)
        : null,
    }),
  });
  routes.post('/library/steam/connect', {
    ...opts,
    schema: {
      ...opts.schema,
      body: z.strictObject({
        authorizationVersion: z.string().max(50).optional(),
        returnTo: z.enum(['/account', '/onboarding']).optional(),
      }),
      response: { 200: z.object({ url: z.url() }) },
    },
    handler: async (req) => {
      requireSteamKey(options.steamApiKey);
      const token = await authorization.grant(req.userId, req.body.authorizationVersion);
      await authorization.revoke(req.session.steamAuthorizationToken);
      const result = await openid.connect(
        req.userId,
        req.session.steamOpenIdState,
        req.body.returnTo,
      );
      req.session.steamAuthorizationToken = token;
      req.session.steamOpenIdState = result.state;
      delete req.session.steamVerifiedId;
      return { url: result.url };
    },
  });
  routes.post('/library/steam/verify', {
    ...opts,
    schema: {
      ...opts.schema,
      body: steamVerifySchema,
      response: { 200: z.object({ steamId: z.string() }) },
    },
    handler: async (req) => {
      await authorization.require(req.userId, req.session.steamAuthorizationToken);
      const steamId = await openid.verify(
        req.userId,
        req.session.steamOpenIdState,
        req.body.parameters,
        req.body.callbackUrl,
      );
      await authorization.require(req.userId, req.session.steamAuthorizationToken);
      req.session.steamVerifiedId = steamId;
      delete req.session.steamOpenIdState;
      return { steamId };
    },
  });
  routes.delete('/library/steam/disconnect', {
    ...opts,
    schema: { ...opts.schema, response: { 204: z.null() } },
    handler: async (req, reply) => {
      await authorization.revoke(req.session.steamAuthorizationToken);
      delete req.session.steamAuthorizationToken;
      await openid.disconnect(req.session.steamOpenIdState);
      delete req.session.steamOpenIdState;
      delete req.session.steamVerifiedId;
      return reply.code(204).send(null);
    },
  });
  routes.post('/library/steam/preview', {
    ...opts,
    schema: {
      ...opts.schema,
      body: steamPreviewSchema,
      response: { 200: steamPreviewResponseSchema },
    },
    handler: async (req) => {
      requireSteamKey(options.steamApiKey);
      await authorization.require(req.userId, req.session.steamAuthorizationToken);
      const preview = await service.preview(req.userId, req.session.steamVerifiedId, req.body);
      await authorization.require(req.userId, req.session.steamAuthorizationToken);
      return preview;
    },
  });
}
