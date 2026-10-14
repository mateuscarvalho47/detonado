import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { describe, expect, it, vi } from 'vitest';
import { libraryRoutes } from '@/modules/library/library.routes.js';

describe('POST /library/:id/hltb', () => {
  it('limits refreshes by user while preserving times on provider failure', async () => {
    const entry = {
      id: 'clxxxxxxxxxxxxxxxxxxxxxxx',
      userId: 'user-1',
      igdbId: 1,
      name: 'Hollow Knight',
      coverUrl: null,
      genres: [],
      platforms: [],
      status: 'BACKLOG',
      completionGoal: 'MAIN',
      userPlatform: null,
      rating: null,
      hoursPlayed: null,
      baseHours: null,
      activeCampaignId: null,
      collections: [],
      tags: [],
      lastSessionAt: null,
      notes: null,
      completedAt: null,
      hltbMain: 27,
      hltbMainExtra: 40,
      hltbCompletionist: null,
      hltbStatus: 'FOUND',
      queuePosition: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    const findByName = vi.fn().mockResolvedValue({ status: 'FAILED' });
    app.decorate('hltb', { findByName } as never);
    app.decorate('igdb', {} as never);
    app.decorate('redis', {} as never);
    app.decorate('prisma', {
      user: { findUnique: vi.fn().mockResolvedValue({ sessionVersion: 0 }) },
      libraryEntry: {
        findFirst: vi.fn().mockImplementation(async () => ({ ...entry })),
        updateManyAndReturn: vi.fn().mockImplementation(async ({ data }) => {
          Object.assign(entry, data);
          return [{ ...entry }];
        }),
      },
    } as never);
    app.addHook('onRequest', async (req) => {
      req.session = { userId: req.headers['x-test-user'] ?? 'user-1' } as never;
    });
    await app.register(rateLimit, { global: false });
    await app.register(libraryRoutes);

    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await app.inject({ method: 'POST', url: `/library/${entry.id}/hltb` });
        expect(response.statusCode).toBe(200);
        expect(response.json()).toMatchObject({
          hltbMain: 27,
          hltbMainExtra: 40,
          hltbStatus: 'FAILED',
        });
      }
      const limited = await app.inject({ method: 'POST', url: `/library/${entry.id}/hltb` });
      expect(limited.statusCode).toBe(429);
      expect(findByName).toHaveBeenCalledTimes(5);

      const anotherUser = await app.inject({
        method: 'POST',
        url: `/library/${entry.id}/hltb`,
        headers: { 'x-test-user': 'user-2' },
      });
      expect(anotherUser.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
});
