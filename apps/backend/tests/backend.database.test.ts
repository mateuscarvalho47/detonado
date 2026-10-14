import { randomUUID } from 'node:crypto';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { PrismaPg } from '@prisma/adapter-pg';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client.js';
import { PreferencesService } from '@/modules/auth/preferences.service.js';
import { CampaignRepository } from '@/modules/campaign/campaign.repository.js';
import { campaignRoutes } from '@/modules/campaign/campaign.routes.js';
import { CampaignService } from '@/modules/campaign/campaign.service.js';
import { ChecklistItemRepository } from '@/modules/checklist-item/checklist-item.repository.js';
import { checklistItemRoutes } from '@/modules/checklist-item/checklist-item.routes.js';
import { ChecklistItemService } from '@/modules/checklist-item/checklist-item.service.js';
import { gameSourceRoutes } from '@/modules/game-source/game-source.routes.js';
import { journalEntryRoutes } from '@/modules/journal-entry/journal-entry.routes.js';
import { LibraryRepository } from '@/modules/library/library.repository.js';
import { RetrospectiveService } from '@/modules/library/library.retrospective.service.js';
import { libraryRoutes } from '@/modules/library/library.routes.js';
import { LibraryService } from '@/modules/library/library.service.js';
import { libraryImportRoutes } from '@/modules/library-import/library-import.routes.js';
import { OrganizationRepository } from '@/modules/organization/organization.repository.js';
import { organizationRoutes } from '@/modules/organization/organization.routes.js';
import { OrganizationService } from '@/modules/organization/organization.service.js';
import { PasswordResetRepository } from '@/modules/password-reset/password-reset.repository.js';
import { PlaySessionRepository } from '@/modules/play-session/play-session.repository.js';
import { playSessionRoutes } from '@/modules/play-session/play-session.routes.js';
import { PlaySessionService } from '@/modules/play-session/play-session.service.js';
import { SavedFilterRepository } from '@/modules/saved-filter/saved-filter.repository.js';
import { SavedFilterService } from '@/modules/saved-filter/saved-filter.service.js';
import { UserRepository } from '@/modules/user/user.repository.js';
import csrf from '@/plugins/csrf.js';
import errorHandler from '@/plugins/errorHandler.js';

// Explicit opt-in; this suite never reads the application's DATABASE_URL.
const testDatabaseUrl = process.env.BACKEND_TEST_DATABASE_URL;

describe.runIf(Boolean(testDatabaseUrl))('backend with PostgreSQL', () => {
  let database: PrismaClient;
  let ownerId: string;
  let anotherUserId: string;

  beforeAll(async () => {
    database = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    const owner = await database.user.create({
      data: { email: `${randomUUID()}@test.invalid`, passwordHash: 'test-only' },
    });
    ownerId = owner.id;
    const anotherUser = await database.user.create({
      data: { email: `${randomUUID()}@test.invalid`, passwordHash: 'test-only' },
    });
    anotherUserId = anotherUser.id;
  });

  afterAll(async () => {
    if (!database) return;
    try {
      if (ownerId || anotherUserId)
        await database.user.deleteMany({
          where: { id: { in: [ownerId, anotherUserId].filter(Boolean) } },
        });
    } finally {
      await database.$disconnect();
    }
  });

  function library() {
    const games = {
      getById: vi.fn(async (igdbId: number) => ({
        igdbId,
        name: `Game ${igdbId}`,
        genres: ['RPG'],
        platforms: ['PC'],
        hltbStatus: 'FOUND',
        hltb: { mainHours: 10, mainExtraHours: 20, completionistHours: null },
      })),
      lookupByName: vi.fn().mockResolvedValue({ status: 'FAILED' }),
    };
    return new LibraryService(new LibraryRepository(database), games as never);
  }

  it('persists and removes platform preference without changing library or session version', async () => {
    const users = new UserRepository(database);
    const catalog = { getPlatforms: vi.fn().mockResolvedValue(['PC (Microsoft Windows)']) };
    const service = new PreferencesService(users, catalog);
    expect((await users.findById(ownerId))?.preferredPlatform).toBeNull();
    await service.update(ownerId, { preferredPlatform: 'PC (Microsoft Windows)' });
    expect((await users.findById(ownerId))?.preferredPlatform).toBe('PC (Microsoft Windows)');
    expect(
      (await users.findByEmailWithHash((await users.findById(ownerId))?.email ?? ''))
        ?.preferredPlatform,
    ).toBe('PC (Microsoft Windows)');
    expect((await users.findByIdWithLibrary(ownerId))?.preferredPlatform).toBe(
      'PC (Microsoft Windows)',
    );
    expect((await users.findById(anotherUserId))?.preferredPlatform).toBeNull();
    await expect(service.update(ownerId, { preferredPlatform: 'Unknown' })).rejects.toMatchObject({
      statusCode: 400,
    });
    catalog.getPlatforms.mockRejectedValue(new Error('unavailable'));
    await service.update(ownerId, { preferredPlatform: null });
    expect((await users.findById(ownerId))?.preferredPlatform).toBeNull();
    expect((await database.user.findUniqueOrThrow({ where: { id: ownerId } })).sessionVersion).toBe(
      0,
    );
    expect(await database.libraryEntry.count({ where: { userId: ownerId } })).toBe(0);
  });

  it('persists, exports and isolates saved filters', async () => {
    const service = new SavedFilterService(new SavedFilterRepository(database));
    const users = new UserRepository(database);
    const created = await service.create(ownerId, {
      name: 'Curtos',
      filters: { statuses: ['BACKLOG'], maxHours: 10, includeUnknownDuration: false },
    });
    expect(await service.list(ownerId)).toHaveLength(1);
    expect(await service.list(anotherUserId)).toEqual([]);
    await expect(
      service.update(created.id, anotherUserId, { name: 'Wrong owner' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.remove(created.id, anotherUserId)).rejects.toMatchObject({
      statusCode: 404,
    });
    const exported = await users.findByIdWithLibrary(ownerId);
    expect(exported?.savedFilters[0]).toMatchObject({ name: 'Curtos', filters: { maxHours: 10 } });
    const updated = await service.update(created.id, ownerId, { filters: {} });
    expect(updated.filters).toEqual({});
    await service.remove(created.id, ownerId);
    expect(await service.list(ownerId)).toEqual([]);
  });

  it('keeps legacy hours, concurrent sessions, manual totals, edits and deletes consistent', async () => {
    const libraries = library();
    const entry = await libraries.create(ownerId, { igdbId: 99999, status: 'PLAYING' });
    await libraries.update(entry.id, ownerId, { hoursPlayed: 2 });
    const sessions = new PlaySessionService(new PlaySessionRepository(database));
    const input = {
      clientId: randomUUID(),
      playedAt: '2026-10-13T12:00:00Z',
      durationMinutes: 20,
      notes: ' Test ',
    };
    const repeated = await Promise.all([
      sessions.create(entry.id, ownerId, input),
      sessions.create(entry.id, ownerId, {
        ...input,
        playedAt: '2026-10-13T09:00:00-03:00',
        notes: 'Test',
      }),
    ]);
    expect(repeated[0].id).toBe(repeated[1].id);
    const five = await sessions.create(entry.id, ownerId, {
      clientId: randomUUID(),
      playedAt: '2026-10-14T12:00:00Z',
      durationMinutes: 5,
    });
    expect((await libraries.getById(entry.id, ownerId)).hoursPlayed?.toNumber()).toBe(2.4);
    await expect(
      sessions.create(entry.id, ownerId, { ...input, durationMinutes: 30 }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await expect(sessions.list(entry.id, anotherUserId)).rejects.toMatchObject({ statusCode: 404 });
    await expect(
      sessions.update(five.id, entry.id, anotherUserId, { durationMinutes: 10 }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(sessions.remove(five.id, entry.id, anotherUserId)).rejects.toMatchObject({
      statusCode: 404,
    });
    await libraries.update(entry.id, ownerId, { hoursPlayed: 1 });
    expect((await libraries.getById(entry.id, ownerId)).baseHours?.toNumber()).toBe(0.6);
    await expect(libraries.update(entry.id, ownerId, { hoursPlayed: 0.3 })).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(libraries.update(entry.id, ownerId, { hoursPlayed: null })).rejects.toMatchObject({
      statusCode: 400,
    });
    await sessions.update(five.id, entry.id, ownerId, { durationMinutes: 40, notes: null });
    expect((await libraries.getById(entry.id, ownerId)).hoursPlayed?.toNumber()).toBe(1.6);
    const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
    expect(
      exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)?.sessions,
    ).toHaveLength(2);
    await sessions.remove(five.id, entry.id, ownerId);
    const remaining = await libraries.getById(entry.id, ownerId);
    expect(remaining.hoursPlayed?.toNumber()).toBe(0.9);
    expect(remaining.lastSessionAt?.toISOString()).toBe('2026-10-13T12:00:00.000Z');
    await sessions.remove(repeated[0].id, entry.id, ownerId);
    expect((await libraries.getById(entry.id, ownerId)).hoursPlayed?.toNumber()).toBe(0.6);
    expect((await libraries.getById(entry.id, ownerId)).lastSessionAt).toBeNull();
    await libraries.update(entry.id, ownerId, { hoursPlayed: 99999.9 });
    await expect(
      sessions.create(entry.id, ownerId, {
        clientId: randomUUID(),
        playedAt: '2026-10-14T12:00:00Z',
        durationMinutes: 60,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await sessions.list(entry.id, ownerId)).toEqual([]);
    expect((await libraries.getById(entry.id, ownerId)).hoursPlayed?.toNumber()).toBe(99999.9);
    await libraries.remove(entry.id, ownerId);
  });

  it('protects session HTTP writes with auth, CSRF and owner checks', async () => {
    const entry = await library().create(ownerId, { igdbId: 99998, status: 'PLAYING' });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(playSessionRoutes, { prefix: '/api' });
    try {
      const base = `/api/library/${entry.id}/sessions`;
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const payload = {
        clientId: randomUUID(),
        playedAt: '2026-10-13T12:00:00Z',
        durationMinutes: 20,
      };
      expect(
        (await app.inject({ method: 'POST', url: base, headers: { cookie }, payload })).statusCode,
      ).toBe(403);
      for (const invalid of [
        { ...payload, durationMinutes: 0 },
        { ...payload, durationMinutes: 1441 },
        { ...payload, playedAt: 'invalid' },
        { ...payload, clientId: 'invalid' },
        { ...payload, extra: true },
      ]) {
        expect(
          (await app.inject({ method: 'POST', url: base, headers, payload: invalid })).statusCode,
        ).toBe(400);
      }
      const created = await app.inject({ method: 'POST', url: base, headers, payload });
      expect(created.statusCode).toBe(201);
      expect(created.json()).not.toHaveProperty('userId');
      const repeated = await app.inject({ method: 'POST', url: base, headers, payload });
      expect(repeated.json().id).toBe(created.json().id);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { ...payload, durationMinutes: 5 },
          })
        ).statusCode,
      ).toBe(409);
      const sessionUrl = `${base}/${created.json().id}`;
      expect(
        (await app.inject({ method: 'PATCH', url: sessionUrl, headers, payload: {} })).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: sessionUrl,
            headers,
            payload: { durationMinutes: 5 },
          })
        ).statusCode,
      ).toBe(200);
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).statusCode).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: sessionUrl,
            headers: otherHeaders,
            payload: { notes: 'Wrong owner' },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: sessionUrl, headers: otherHeaders })).statusCode,
      ).toBe(404);
      expect((await app.inject({ method: 'DELETE', url: sessionUrl, headers })).statusCode).toBe(
        204,
      );
      expect((await app.inject({ url: base, headers })).json()).toEqual({ sessions: [] });
    } finally {
      await app.close();
      await library().remove(entry.id, ownerId);
    }
  });

  it('isolates collections and tags, replaces memberships atomically and preserves games on deletion', async () => {
    const libraries = library();
    const organization = new OrganizationService(new OrganizationRepository(database));
    const entry = await libraries.create(ownerId, { igdbId: 99997, status: 'PLAYING' });
    const collection = await organization.create('collections', ownerId, { name: 'Favoritos' });
    const tag = await organization.create('tags', ownerId, { name: 'Portátil' });
    const foreign = await organization.create('collections', anotherUserId, { name: 'Favoritos' });
    await expect(
      organization.create('collections', ownerId, { name: 'Favoritos' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    await organization.replace(entry.id, ownerId, {
      collectionIds: [collection.id],
      tagIds: [tag.id],
    });
    expect(await libraries.getById(entry.id, ownerId)).toMatchObject({
      collectionIds: [collection.id],
      tagIds: [tag.id],
    });
    await expect(
      organization.replace(entry.id, ownerId, { collectionIds: [foreign.id], tagIds: [] }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await libraries.getById(entry.id, ownerId)).toMatchObject({
      collectionIds: [collection.id],
      tagIds: [tag.id],
    });
    await expect(
      database.collectionEntry.create({
        data: { entryId: entry.id, userId: ownerId, collectionId: foreign.id },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    await expect(
      organization.update('collections', collection.id, anotherUserId, { name: 'Other' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(organization.remove('tags', tag.id, anotherUserId)).rejects.toMatchObject({
      statusCode: 404,
    });
    const filters = new SavedFilterService(new SavedFilterRepository(database));
    const saved = await filters.create(ownerId, {
      name: 'Organizados',
      filters: { collectionId: collection.id, tagId: tag.id },
    });
    await expect(
      filters.create(ownerId, { name: 'Foreign', filters: { collectionId: foreign.id } }),
    ).rejects.toMatchObject({ statusCode: 400 });
    const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
    expect(exported?.collections).toHaveLength(1);
    expect(exported?.tags).toHaveLength(1);
    expect(
      exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)?.collections,
    ).toEqual([{ collectionId: collection.id }]);
    await organization.remove('collections', collection.id, ownerId);
    await organization.remove('tags', tag.id, ownerId);
    expect(await libraries.getById(entry.id, ownerId)).toMatchObject({
      collectionIds: [],
      tagIds: [],
    });
    await filters.remove(saved.id, ownerId);
    await libraries.remove(entry.id, ownerId);
    await organization.remove('collections', foreign.id, anotherUserId);
  });

  it('protects organization HTTP CRUD and membership validation', async () => {
    const entry = await library().create(ownerId, { igdbId: 99996, status: 'PLAYING' });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(organizationRoutes, { prefix: '/api' });
    try {
      expect((await app.inject({ url: '/api/library/collections' })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      for (const kind of ['collections', 'tags']) {
        const base = `/api/library/${kind}`;
        expect(
          (
            await app.inject({
              method: 'POST',
              url: base,
              headers: { cookie },
              payload: { name: 'Test' },
            })
          ).statusCode,
        ).toBe(403);
        for (const payload of [
          { name: '' },
          { name: 'x'.repeat(101) },
          { name: 'Test', unknown: true },
        ]) {
          expect(
            (await app.inject({ method: 'POST', url: base, headers, payload })).statusCode,
          ).toBe(400);
        }
        const created = await app.inject({
          method: 'POST',
          url: base,
          headers,
          payload: { name: '  Test  ' },
        });
        expect(created.statusCode).toBe(201);
        expect(created.json().name).toBe('Test');
        expect(created.json()).not.toHaveProperty('userId');
        expect((await app.inject({ url: base, headers })).json()[kind]).toHaveLength(1);
        expect((await app.inject({ url: base, headers: otherHeaders })).json()[kind]).toEqual([]);
        const path = `${base}/${created.json().id}`;
        expect(
          (
            await app.inject({
              method: 'PATCH',
              url: path,
              headers: otherHeaders,
              payload: { name: 'Other' },
            })
          ).statusCode,
        ).toBe(404);
        expect(
          (await app.inject({ method: 'DELETE', url: path, headers: otherHeaders })).statusCode,
        ).toBe(404);
        expect(
          (
            await app.inject({ method: 'PATCH', url: path, headers, payload: { name: 'Renamed' } })
          ).json().name,
        ).toBe('Renamed');
        expect((await app.inject({ method: 'DELETE', url: path, headers })).statusCode).toBe(204);
      }
      const path = `/api/library/${entry.id}/organization`;
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers,
            payload: { collectionIds: ['same', 'same'], tagIds: [] },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (await app.inject({ method: 'PATCH', url: path, headers, payload: { collectionIds: [] } }))
          .statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers: otherHeaders,
            payload: { collectionIds: [], tagIds: [] },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers,
            payload: { collectionIds: [], tagIds: [] },
          })
        ).statusCode,
      ).toBe(200);
    } finally {
      await app.close();
      await library().remove(entry.id, ownerId);
    }
  });

  it('changes completion goal without changing progress and protects checklist HTTP CRUD', async () => {
    const libraries = library();
    const entry = await libraries.create(ownerId, { igdbId: 99995, status: 'PLAYING' });
    expect(entry.completionGoal).toBe('MAIN');
    await libraries.update(entry.id, ownerId, {
      hoursPlayed: 12.5,
      rating: 8,
      notes: 'Onde parei',
    });
    const before = await libraries.getById(entry.id, ownerId);
    const changed = await libraries.update(entry.id, ownerId, { completionGoal: 'COMPLETIONIST' });
    expect(changed).toMatchObject({
      completionGoal: 'COMPLETIONIST',
      status: before.status,
      notes: before.notes,
      hltbMain: before.hltbMain,
      hltbMainExtra: before.hltbMainExtra,
      hltbCompletionist: before.hltbCompletionist,
    });
    expect(changed.hoursPlayed?.toNumber()).toBe(12.5);
    const checklist = new ChecklistItemService(new ChecklistItemRepository(database));
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(checklistItemRoutes, { prefix: '/api' });
    try {
      const base = `/api/library/${entry.id}/checklist`;
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: { cookie },
            payload: { text: 'Test' },
          })
        ).statusCode,
      ).toBe(403);
      for (const payload of [
        { text: '' },
        { text: 'x'.repeat(501) },
        { text: 'Test', completed: true },
      ]) {
        expect((await app.inject({ method: 'POST', url: base, headers, payload })).statusCode).toBe(
          400,
        );
      }
      const created = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: { text: '  Finalizar missão  ' },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().text).toBe('Finalizar missão');
      expect(created.json().completed).toBe(false);
      expect(created.json()).not.toHaveProperty('userId');
      const path = `${base}/${created.json().id}`;
      expect(
        (await app.inject({ method: 'PATCH', url: path, headers, payload: {} })).statusCode,
      ).toBe(400);
      expect(
        (await app.inject({ method: 'PATCH', url: path, headers, payload: { completed: 'yes' } }))
          .statusCode,
      ).toBe(400);
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).statusCode).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers: otherHeaders,
            payload: { completed: true },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: path, headers: otherHeaders })).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers,
            payload: { completed: true, text: 'Concluído' },
          })
        ).json(),
      ).toMatchObject({ completed: true, text: 'Concluído' });
      expect((await libraries.getById(entry.id, ownerId)).status).toBe('PLAYING');
      const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
      expect(exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)).toMatchObject({
        completionGoal: 'COMPLETIONIST',
        checklist: [{ text: 'Concluído', completed: true }],
      });
      expect((await app.inject({ method: 'DELETE', url: path, headers })).statusCode).toBe(204);
      expect((await app.inject({ url: base, headers })).json()).toEqual({ items: [] });
      await checklist.create(entry.id, ownerId, { text: 'Cascade' });
      await libraries.remove(entry.id, ownerId);
      expect(await database.checklistItem.count({ where: { entryId: entry.id } })).toBe(0);
    } finally {
      await app.close();
      await database.libraryEntry.deleteMany({ where: { id: entry.id, userId: ownerId } });
    }
  });

  it('archives campaigns, isolates historical sessions and counts completions without duplicate active snapshots', async () => {
    const libraries = library();
    const entry = await libraries.create(ownerId, { igdbId: 99994, status: 'PLAYING' });
    const campaigns = new CampaignService(new CampaignRepository(database));
    const sessions = new PlaySessionService(new PlaySessionRepository(database));
    try {
      const foreignEntry = await libraries.create(anotherUserId, {
        igdbId: 99991,
        status: 'PLAYING',
      });
      try {
        await expect(
          database.libraryEntry.update({
            where: { id: entry.id },
            data: { activeCampaignId: foreignEntry.activeCampaignId },
          }),
        ).rejects.toMatchObject({ code: 'P2003' });
        await expect(
          database.playSession.create({
            data: {
              entryId: entry.id,
              userId: ownerId,
              campaignId: foreignEntry.activeCampaignId ?? '',
              clientId: randomUUID(),
              playedAt: new Date(),
              durationMinutes: 5,
            },
          }),
        ).rejects.toMatchObject({ code: 'P2003' });
        await expect(
          sessions.list(entry.id, ownerId, foreignEntry.activeCampaignId ?? ''),
        ).rejects.toMatchObject({ statusCode: 404 });
      } finally {
        await libraries.remove(foreignEntry.id, anotherUserId);
      }
      expect(entry.activeCampaignId).toBeTruthy();
      await libraries.update(entry.id, ownerId, {
        status: 'COMPLETED',
        hoursPlayed: 3,
        rating: 9,
        notes: 'Primeira campanha',
        completionGoal: 'EXTRAS',
      });
      const input = {
        clientId: randomUUID(),
        campaignId: entry.activeCampaignId,
        playedAt: new Date().toISOString(),
        durationMinutes: 30,
        notes: 'Final',
      };
      const original = await sessions.create(entry.id, ownerId, input);
      const checklist = new ChecklistItemService(new ChecklistItemRepository(database));
      const item = await checklist.create(entry.id, ownerId, { text: 'Missão' });
      await checklist.update(item.id, entry.id, ownerId, { completed: true });
      const next = await campaigns.create(entry.id, ownerId, { notes: 'Rejogada' });
      const current = await libraries.getById(entry.id, ownerId);
      expect(current).toMatchObject({
        activeCampaignId: next.id,
        status: 'PLAYING',
        rating: null,
        completedAt: null,
        notes: 'Rejogada',
        completionGoal: 'EXTRAS',
        hltbMain: 10,
        hltbMainExtra: 20,
        lastSessionAt: null,
      });
      expect(current.hoursPlayed?.toNumber()).toBe(0);
      expect((await checklist.list(entry.id, ownerId))[0].completed).toBe(false);
      expect(await sessions.list(entry.id, ownerId)).toEqual([]);
      expect(await sessions.list(entry.id, ownerId, original.campaignId)).toHaveLength(1);
      const history = await campaigns.list(entry.id, ownerId);
      expect(history[0]).toMatchObject({
        id: next.id,
        isActive: true,
        archivedAt: null,
        hoursPlayed: 0,
      });
      expect(history.find((row) => row.id === original.campaignId)).toMatchObject({
        isActive: false,
        status: 'COMPLETED',
        baseHours: 3,
        hoursPlayed: 3.5,
        rating: 9,
        notes: 'Primeira campanha',
        completionGoal: 'EXTRAS',
      });
      expect((await sessions.create(entry.id, ownerId, input)).id).toBe(original.id);
      await expect(
        sessions.create(entry.id, ownerId, { ...input, clientId: randomUUID() }),
      ).rejects.toMatchObject({ statusCode: 409 });
      await expect(
        sessions.create(entry.id, ownerId, { ...input, campaignId: next.id }),
      ).rejects.toMatchObject({ statusCode: 409 });
      await sessions.update(original.id, entry.id, ownerId, { durationMinutes: 60 });
      expect(
        (await campaigns.list(entry.id, ownerId)).find((row) => row.id === original.campaignId)
          ?.hoursPlayed,
      ).toBe(4);
      expect((await libraries.getById(entry.id, ownerId)).hoursPlayed?.toNumber()).toBe(0);
      await sessions.remove(original.id, entry.id, ownerId);
      await sessions.create(entry.id, ownerId, {
        clientId: randomUUID(),
        campaignId: next.id,
        playedAt: new Date().toISOString(),
        durationMinutes: 45,
      });
      await libraries.update(entry.id, ownerId, { hoursPlayed: 1, status: 'COMPLETED' });
      const queued = await libraries.create(ownerId, { igdbId: 99992, status: 'BACKLOG' });
      await libraries.update(queued.id, ownerId, { hoursPlayed: 2 });
      await campaigns.create(queued.id, ownerId, {});
      await libraries.update(queued.id, ownerId, { status: 'WISHLIST', hoursPlayed: 1 });
      expect((await libraries.getStats(ownerId)).totalHours).toBe(7);
      await libraries.remove(queued.id, ownerId);
      const stats = await libraries.getStats(ownerId);
      expect(stats.totalGames).toBe(1);
      expect(stats.totalHours).toBe(4);
      expect(stats.completedCampaigns).toBe(2);
      expect(stats.completedTimeline.reduce((sum, row) => sum + row.count, 0)).toBe(2);
      expect(stats.countByStatus.COMPLETED).toBe(1);
      await Promise.all([
        campaigns.create(entry.id, ownerId, {}),
        campaigns.create(entry.id, ownerId, {}),
      ]);
      const all = await campaigns.list(entry.id, ownerId);
      expect(all).toHaveLength(4);
      expect(all.filter((row) => row.isActive)).toHaveLength(1);
      expect(all.filter((row) => row.archivedAt !== null)).toHaveLength(3);
      const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
      expect(
        exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)?.campaigns,
      ).toHaveLength(4);
      await expect(campaigns.list(entry.id, anotherUserId)).rejects.toMatchObject({
        statusCode: 404,
      });
      await expect(campaigns.create(entry.id, anotherUserId, {})).rejects.toMatchObject({
        statusCode: 404,
      });
    } finally {
      await libraries.remove(entry.id, ownerId);
    }
  });

  it('protects campaign HTTP creation and historical session queries', async () => {
    const entry = await library().create(ownerId, { igdbId: 99993, status: 'PLAYING' });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(campaignRoutes, { prefix: '/api' });
    await app.register(playSessionRoutes, { prefix: '/api' });
    try {
      const base = `/api/library/${entry.id}/campaigns`;
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      expect(
        (await app.inject({ method: 'POST', url: base, headers: { cookie }, payload: {} }))
          .statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { startedAt: 'invalid' },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { startedAt: '2999-01-01T00:00:00Z' },
          })
        ).statusCode,
      ).toBe(400);
      const created = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: { notes: 'Nova campanha' },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json()).toMatchObject({
        isActive: true,
        hoursPlayed: 0,
        notes: 'Nova campanha',
      });
      expect(created.json()).not.toHaveProperty('userId');
      expect((await app.inject({ url: base, headers })).json().campaigns).toHaveLength(2);
      const sessions = `/api/library/${entry.id}/sessions`;
      expect(
        (await app.inject({ url: `${sessions}?campaignId=${entry.activeCampaignId}`, headers }))
          .statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ url: `${sessions}?campaignId=missing`, headers })).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: sessions,
            headers,
            payload: {
              clientId: randomUUID(),
              campaignId: entry.activeCampaignId,
              playedAt: new Date().toISOString(),
              durationMinutes: 10,
            },
          })
        ).statusCode,
      ).toBe(409);
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).statusCode).toBe(404);
      expect(
        (await app.inject({ method: 'POST', url: base, headers: otherHeaders, payload: {} }))
          .statusCode,
      ).toBe(404);
    } finally {
      await app.close();
      await library().remove(entry.id, ownerId);
    }
  });

  it('imports HTTP rows with explicit duplicate updates, owner isolation and session hour guards', async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    const cache = new Map<string, string>();
    app.decorate('redis', {
      get: async (key: string) => cache.get(key) ?? null,
      set: async (key: string, value: string) => {
        cache.set(key, value);
      },
    } as never);
    app.decorate('igdb', {
      getGameById: vi.fn(async (igdbId: number) =>
        igdbId === 99903
          ? null
          : { igdbId, name: `Imported ${igdbId}`, platforms: ['PC'], genres: ['RPG'] },
      ),
    } as never);
    app.decorate('hltb', {
      findByName: vi.fn().mockResolvedValue({
        status: 'FOUND',
        times: { mainHours: 10, mainExtraHours: 20, completionistHours: 30 },
      }),
    } as never);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id === 'anonymous' ? undefined : req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(libraryImportRoutes, { prefix: '/api' });
    try {
      const base = '/api/library/import';
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const anon = await app.inject({ url: '/test-session/anonymous' });
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/preview`,
            headers: {
              cookie: String(anon.headers['set-cookie']).split(';')[0],
              'x-csrf-token': 'test-csrf',
            },
            payload: { rows: [{ igdbId: 99901 }] },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: { cookie },
            payload: { rows: [{ igdbId: 99901 }] },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: `${base}/preview`,
            headers,
            payload: { rows: Array(101).fill({ igdbId: 99901 }) },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { rows: Array(11).fill({ igdbId: 99901 }) },
          })
        ).statusCode,
      ).toBe(400);
      const preview = await app.inject({
        method: 'POST',
        url: `${base}/preview`,
        headers,
        payload: { rows: [{ igdbId: '99901', hoursPlayed: '2' }, { name: 'Unresolved' }, false] },
      });
      expect(preview.statusCode).toBe(200);
      expect(preview.json().rows.map((row: { state: string }) => row.state)).toEqual([
        'READY',
        'NEEDS_MATCH',
        'INVALID',
      ]);
      expect(await database.libraryEntry.count({ where: { userId: ownerId } })).toBe(0);
      const created = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: {
          rows: [
            {
              igdbId: 99901,
              status: 'PLAYING',
              hoursPlayed: 2,
              rating: 0,
              notes: 'Preservar',
              completionGoal: 'EXTRAS',
            },
            { igdbId: 99903 },
          ],
        },
      });
      expect(created.statusCode).toBe(200);
      expect(created.json().summary).toEqual({ added: 1, updated: 0, skipped: 0, failed: 1 });
      const entryId = created.json().results[0].entryId;
      const entry = await library().getById(entryId, ownerId);
      expect(entry.activeCampaignId).toBeTruthy();
      expect(entry.baseHours?.toNumber()).toBe(2);
      expect(entry.rating).toBe(0);
      const sessions = new PlaySessionService(new PlaySessionRepository(database));
      await sessions.create(entryId, ownerId, {
        clientId: randomUUID(),
        campaignId: entry.activeCampaignId,
        playedAt: new Date().toISOString(),
        durationMinutes: 45,
      });
      const skipped = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: { rows: [{ igdbId: 99901, hoursPlayed: 0 }] },
      });
      expect(skipped.json().summary.skipped).toBe(1);
      expect((await library().getById(entryId, ownerId)).hoursPlayed?.toNumber()).toBe(2.8);
      const updated = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: {
          rows: [
            { igdbId: 99901, duplicateAction: 'UPDATE', hoursPlayed: 0.5 },
            { igdbId: 99901, duplicateAction: 'UPDATE', rating: 9 },
          ],
        },
      });
      expect(updated.json().summary).toEqual({ added: 0, updated: 1, skipped: 0, failed: 1 });
      expect(await library().getById(entryId, ownerId)).toMatchObject({
        status: 'PLAYING',
        notes: 'Preservar',
        completionGoal: 'EXTRAS',
        activeCampaignId: entry.activeCampaignId,
        rating: 9,
      });
      expect(await sessions.list(entryId, ownerId)).toHaveLength(1);
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      const other = await app.inject({
        method: 'POST',
        url: base,
        headers: otherHeaders,
        payload: { rows: [{ igdbId: 99901, duplicateAction: 'UPDATE', notes: 'Minha conta' }] },
      });
      expect(other.json().summary.added).toBe(1);
      expect((await library().getById(entryId, ownerId)).notes).toBe('Preservar');
      expect(await database.libraryEntry.count({ where: { userId: ownerId, igdbId: 99903 } })).toBe(
        0,
      );
    } finally {
      await app.close();
      await database.libraryEntry.deleteMany({
        where: { userId: { in: [ownerId, anotherUserId] }, igdbId: { in: [99901, 99903] } },
      });
    }
  });

  it('supports multiple sources and protects source HTTP ownership without changing games', async () => {
    const entry = await library().create(ownerId, { igdbId: 99801, status: 'PLAYING' });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(gameSourceRoutes, { prefix: '/api' });
    try {
      const base = `/api/library/${entry.id}/sources`;
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: { cookie },
            payload: { kind: 'STORE', label: 'Steam' },
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { kind: 'STORE', label: 'Steam', expiresAt: 'invalid' },
          })
        ).statusCode,
      ).toBe(400);
      const permanent = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: { kind: 'STORE', label: '  Steam  ' },
      });
      expect(permanent.statusCode).toBe(201);
      expect(permanent.json()).toMatchObject({ kind: 'STORE', label: 'Steam', expiresAt: null });
      expect(permanent.json()).not.toHaveProperty('userId');
      const expired = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: {
          kind: 'SUBSCRIPTION',
          label: 'Assinatura antiga',
          expiresAt: '2020-01-01T10:00:00-03:00',
        },
      });
      expect(expired.json().expiresAt).toBe('2020-01-01T13:00:00.000Z');
      expect((await app.inject({ url: base, headers })).json().sources).toHaveLength(2);
      const libraryRow = await library().getById(entry.id, ownerId);
      expect(libraryRow.sources).toHaveLength(2);
      expect(libraryRow.activeCampaignId).toBe(entry.activeCampaignId);
      expect(libraryRow.status).toBe('PLAYING');
      const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
      expect(
        exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)?.sources,
      ).toHaveLength(2);
      const path = `${base}/${expired.json().id}`;
      expect(
        (await app.inject({ method: 'PATCH', url: path, headers, payload: {} })).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({ method: 'PATCH', url: path, headers, payload: { expiresAt: null } })
        ).json().expiresAt,
      ).toBeNull();
      expect(
        (
          await app.inject({ method: 'PATCH', url: path, headers, payload: { label: 'Renovada' } })
        ).json(),
      ).toMatchObject({ label: 'Renovada', expiresAt: null });
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).statusCode).toBe(404);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: otherHeaders,
            payload: { kind: 'LOAN', label: 'Other' },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers: otherHeaders,
            payload: { label: 'Other' },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: path, headers: otherHeaders })).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `/api/library/missing/sources/${expired.json().id}`,
            headers,
            payload: { label: 'Wrong parent' },
          })
        ).statusCode,
      ).toBe(404);
      await expect(
        database.gameSource.create({
          data: { entryId: entry.id, userId: anotherUserId, kind: 'LOAN', label: 'Foreign owner' },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      expect((await app.inject({ method: 'DELETE', url: path, headers })).statusCode).toBe(204);
      expect((await library().getById(entry.id, ownerId)).sources).toHaveLength(1);
      await library().remove(entry.id, ownerId);
      expect(await database.gameSource.count({ where: { entryId: entry.id } })).toBe(0);
    } finally {
      await app.close();
      await database.libraryEntry.deleteMany({ where: { id: entry.id, userId: ownerId } });
    }
  });

  it('keeps a dated journal across campaigns and never overwrites where-I-stopped notes', async () => {
    const entry = await library().create(ownerId, { igdbId: 99701, status: 'PLAYING' });
    await library().update(entry.id, ownerId, { notes: 'Onde parei original' });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(journalEntryRoutes, { prefix: '/api' });
    try {
      const base = `/api/library/${entry.id}/journal`;
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const payload = {
        text: '  Diário da campanha  ',
        occurredAt: '2026-10-14T01:00:00-03:00',
        campaignId: entry.activeCampaignId,
      };
      expect(
        (await app.inject({ method: 'POST', url: base, headers: { cookie }, payload })).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { ...payload, text: '' },
          })
        ).statusCode,
      ).toBe(400);
      const created = await app.inject({ method: 'POST', url: base, headers, payload });
      expect(created.statusCode).toBe(201);
      expect(created.json()).toMatchObject({
        text: 'Diário da campanha',
        occurredAt: '2026-10-14T04:00:00.000Z',
        spoiler: false,
        legacy: false,
        campaignId: entry.activeCampaignId,
      });
      expect(created.json()).not.toHaveProperty('userId');
      expect((await library().getById(entry.id, ownerId)).notes).toBe('Onde parei original');
      const path = `${base}/${created.json().id}`;
      expect(
        (
          await app.inject({ method: 'PATCH', url: path, headers, payload: { spoiler: true } })
        ).json().spoiler,
      ).toBe(true);
      expect(
        (await app.inject({ method: 'PATCH', url: path, headers, payload: { legacy: true } }))
          .statusCode,
      ).toBe(400);
      const next = await new CampaignService(new CampaignRepository(database)).create(
        entry.id,
        ownerId,
        { notes: 'Onde parei agora' },
      );
      expect((await app.inject({ method: 'POST', url: base, headers, payload })).statusCode).toBe(
        409,
      );
      const newer = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: { ...payload, campaignId: next.id, text: 'Nova campanha' },
      });
      expect(newer.statusCode).toBe(201);
      expect((await app.inject({ url: base, headers })).json().entries).toHaveLength(2);
      expect(
        (await app.inject({ url: `${base}?campaignId=${entry.activeCampaignId}`, headers })).json()
          .entries,
      ).toHaveLength(1);
      expect((await app.inject({ url: `${base}?campaignId=missing`, headers })).statusCode).toBe(
        404,
      );
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers,
            payload: { text: 'Histórico editado', spoiler: false },
          })
        ).json(),
      ).toMatchObject({
        text: 'Histórico editado',
        spoiler: false,
        campaignId: entry.activeCampaignId,
      });
      expect((await library().getById(entry.id, ownerId)).notes).toBe('Onde parei agora');
      const legacy = await database.journalEntry.create({
        data: {
          entryId: entry.id,
          userId: ownerId,
          campaignId: next.id,
          text: 'Anotação antiga',
          occurredAt: new Date(),
          legacy: true,
        },
      });
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `${base}/${legacy.id}`,
            headers,
            payload: { text: 'Antiga revisada' },
          })
        ).json(),
      ).toMatchObject({ text: 'Antiga revisada', legacy: true });
      const exported = await new UserRepository(database).findByIdWithLibrary(ownerId);
      expect(
        exported?.libraryEntries.find((row) => row.igdbId === entry.igdbId)?.journal,
      ).toHaveLength(3);
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).statusCode).toBe(404);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: otherHeaders,
            payload: { ...payload, campaignId: next.id },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: path,
            headers: otherHeaders,
            payload: { text: 'Other' },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: path, headers: otherHeaders })).statusCode,
      ).toBe(404);
      await expect(
        database.journalEntry.create({
          data: {
            entryId: entry.id,
            userId: anotherUserId,
            campaignId: next.id,
            text: 'Foreign',
            occurredAt: new Date(),
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
      expect((await app.inject({ method: 'DELETE', url: path, headers })).statusCode).toBe(204);
      expect((await library().getById(entry.id, ownerId)).notes).toBe('Onde parei agora');
    } finally {
      await app.close();
      await library().remove(entry.id, ownerId);
    }
    expect(await database.journalEntry.count({ where: { entryId: entry.id } })).toBe(0);
  });

  it('reports local session dates, calendar completions and previous periods with owner isolation', async () => {
    const libraries = library();
    const entry = await libraries.create(ownerId, { igdbId: 99601, status: 'BACKLOG' });
    const foreign = await libraries.create(anotherUserId, { igdbId: 99601, status: 'PLAYING' });
    const sessions = new PlaySessionService(new PlaySessionRepository(database));
    const retrospective = new RetrospectiveService(new LibraryRepository(database));
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    app.decorate('igdb', {} as never);
    app.decorate('redis', {} as never);
    app.decorate('hltb', {} as never);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      return {};
    });
    await app.register(libraryRoutes, { prefix: '/api' });
    try {
      await libraries.update(entry.id, ownerId, { hoursPlayed: 100 });
      for (const [playedAt, durationMinutes] of [
        ['2024-02-29T02:59:59Z', 60],
        ['2024-03-01T02:59:59Z', 30],
        ['2024-03-01T03:00:00Z', 5],
      ] as const)
        await sessions.create(entry.id, ownerId, {
          clientId: randomUUID(),
          playedAt,
          durationMinutes,
        });
      await sessions.create(foreign.id, anotherUserId, {
        clientId: randomUUID(),
        playedAt: '2024-02-29T12:00:00Z',
        durationMinutes: 99,
      });
      await libraries.update(entry.id, ownerId, { status: 'COMPLETED', completedAt: '2024-02-29' });
      await new CampaignService(new CampaignRepository(database)).create(entry.id, ownerId, {});
      await libraries.update(entry.id, ownerId, {
        status: 'COMPLETED',
        completedAt: '2024-03-01',
        hoursPlayed: 200,
      });
      for (const [playedAt, durationMinutes] of [
        ['2025-01-01T02:59:59Z', 15],
        ['2025-01-01T03:00:00Z', 10],
      ] as const)
        await sessions.create(entry.id, ownerId, {
          clientId: randomUUID(),
          playedAt,
          durationMinutes,
        });
      const february = await retrospective.get(ownerId, { year: 2024, month: 2 });
      expect(february.current).toEqual({
        sessions: 2,
        minutes: 90,
        playedGames: 1,
        completedCampaigns: 1,
      });
      expect(february.series).toHaveLength(29);
      expect(february.series.find((row) => row.date === '2024-02-28')).toMatchObject({
        minutes: 60,
      });
      expect(february.series.find((row) => row.date === '2024-02-29')).toMatchObject({
        minutes: 30,
        completedCampaigns: 1,
      });
      const march = await retrospective.get(ownerId, { year: 2024, month: 3 });
      expect(march.current).toEqual({
        sessions: 1,
        minutes: 5,
        playedGames: 1,
        completedCampaigns: 1,
      });
      const january = await retrospective.get(ownerId, { year: 2025, month: 1 });
      expect(january.current.minutes).toBe(10);
      expect(january.previous.stats.minutes).toBe(15);
      expect(january.previous.period.year).toBe(2024);
      const year = await retrospective.get(ownerId, { year: 2024 });
      expect(year.series).toHaveLength(12);
      expect(year.current.minutes).toBe(110);
      expect(year.current.completedCampaigns).toBe(2);
      expect(year.untrackedHoursExcluded).toBe(true);
      const empty = await retrospective.get(ownerId, { year: 2030, month: 12 });
      expect(empty.current).toEqual({
        sessions: 0,
        minutes: 0,
        playedGames: 0,
        completedCampaigns: 0,
      });
      expect(empty.series).toHaveLength(31);
      const base = '/api/library/retrospective';
      expect((await app.inject({ url: `${base}?year=2024&month=2` })).statusCode).toBe(401);
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const headers = { cookie: String(login.headers['set-cookie']).split(';')[0] };
      for (const query of [
        'year=1969',
        'year=2101',
        'year=2024&month=0',
        'year=2024&month=13',
        'year=invalid',
        'month=2',
      ])
        expect((await app.inject({ url: `${base}?${query}`, headers })).statusCode).toBe(400);
      const response = await app.inject({ url: `${base}?year=2024&month=2`, headers });
      expect(response.statusCode).toBe(200);
      expect(response.json().current.minutes).toBe(90);
      expect(response.json().timeZone).toBe('America/Sao_Paulo');
      const otherLogin = await app.inject({ url: `/test-session/${anotherUserId}` });
      const otherHeaders = { cookie: String(otherLogin.headers['set-cookie']).split(';')[0] };
      expect(
        (await app.inject({ url: `${base}?year=2024&month=2`, headers: otherHeaders })).json()
          .current,
      ).toEqual({ sessions: 1, minutes: 99, playedGames: 1, completedCampaigns: 0 });
    } finally {
      await app.close();
      await libraries.remove(entry.id, ownerId);
      await libraries.remove(foreign.id, anotherUserId);
    }
  });

  it('bulk-edits each owned game atomically while preserving campaigns, sessions and collections', async () => {
    const libraries = library();
    const first = await libraries.create(ownerId, { igdbId: 99501, status: 'BACKLOG' });
    const second = await libraries.create(ownerId, { igdbId: 99502, status: 'BACKLOG' });
    const foreign = await libraries.create(anotherUserId, { igdbId: 99503, status: 'PLAYING' });
    await database.libraryEntry.update({
      where: { id: second.id },
      data: { platforms: ['Nintendo Switch'] },
    });
    await libraries.update(first.id, ownerId, {
      hoursPlayed: 2,
      rating: 8,
      notes: 'Preservar',
      completionGoal: 'EXTRAS',
    });
    const sessions = new PlaySessionService(new PlaySessionRepository(database));
    await sessions.create(first.id, ownerId, {
      clientId: randomUUID(),
      campaignId: first.activeCampaignId,
      playedAt: new Date().toISOString(),
      durationMinutes: 60,
    });
    const organization = new OrganizationService(new OrganizationRepository(database));
    const collection = await organization.create('collections', ownerId, {
      name: 'Bulk collection',
    });
    const oldTag = await organization.create('tags', ownerId, { name: 'Bulk old' });
    const newTag = await organization.create('tags', ownerId, { name: 'Bulk new' });
    const foreignTag = await organization.create('tags', anotherUserId, { name: 'Bulk foreign' });
    await organization.replace(first.id, ownerId, {
      collectionIds: [collection.id],
      tagIds: [oldTag.id],
    });
    await organization.replace(second.id, ownerId, { collectionIds: [], tagIds: [oldTag.id] });
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', database);
    app.decorate('igdb', {} as never);
    app.decorate('redis', {} as never);
    app.decorate('hltb', {} as never);
    await app.register(errorHandler);
    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'test-secret-with-at-least-32-characters',
      saveUninitialized: false,
      cookie: { secure: false },
    });
    await app.register(csrf);
    app.get<{ Params: { id: string } }>('/test-session/:id', async (req) => {
      req.session.userId = req.params.id === 'anonymous' ? undefined : req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(libraryRoutes, { prefix: '/api' });
    try {
      const url = '/api/library/bulk';
      const login = await app.inject({ url: `/test-session/${ownerId}` });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const payload = {
        ids: [first.id, second.id],
        changes: { status: 'COMPLETED', userPlatform: 'PC', tagIds: [newTag.id] },
      };
      expect(
        (await app.inject({ method: 'POST', url, headers: { cookie }, payload })).statusCode,
      ).toBe(403);
      const anon = await app.inject({ url: '/test-session/anonymous' });
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            headers: {
              cookie: String(anon.headers['set-cookie']).split(';')[0],
              'x-csrf-token': 'test-csrf',
            },
            payload,
          })
        ).statusCode,
      ).toBe(401);
      for (const invalid of [
        { ids: [first.id, first.id], changes: { status: 'PLAYING' } },
        { ids: [first.id], changes: {} },
        { ids: [first.id], changes: { rating: 0 } },
      ])
        expect(
          (await app.inject({ method: 'POST', url, headers, payload: invalid })).statusCode,
        ).toBe(400);
      const result = await app.inject({ method: 'POST', url, headers, payload });
      expect(result.statusCode).toBe(200);
      expect(result.json().summary).toEqual({ updated: 1, failed: 1 });
      const updated = await libraries.getById(first.id, ownerId);
      expect(updated).toMatchObject({
        status: 'COMPLETED',
        userPlatform: 'PC',
        tagIds: [newTag.id],
        collectionIds: [collection.id],
        activeCampaignId: first.activeCampaignId,
        rating: 8,
        notes: 'Preservar',
        completionGoal: 'EXTRAS',
        queuePosition: null,
      });
      expect(updated.completedAt).not.toBeNull();
      expect(updated.hoursPlayed?.toNumber()).toBe(3);
      const unchanged = await libraries.getById(second.id, ownerId);
      expect(unchanged).toMatchObject({
        status: 'BACKLOG',
        userPlatform: null,
        tagIds: [oldTag.id],
        queuePosition: second.queuePosition,
      });
      const badTag = await app.inject({
        method: 'POST',
        url,
        headers,
        payload: { ids: [first.id], changes: { status: 'PLAYING', tagIds: [foreignTag.id] } },
      });
      expect(badTag.json().summary).toEqual({ updated: 0, failed: 1 });
      expect((await libraries.getById(first.id, ownerId)).status).toBe('COMPLETED');
      expect((await libraries.getById(first.id, ownerId)).tagIds).toEqual([newTag.id]);
      await libraries.update(first.id, ownerId, { completedAt: null });
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            headers,
            payload: { ids: [first.id], changes: { tagIds: [newTag.id] } },
          })
        ).json().summary.updated,
      ).toBe(1);
      expect((await libraries.getById(first.id, ownerId)).completedAt).toBeNull();
      const mixed = await app.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          ids: [first.id, foreign.id],
          changes: { status: 'BACKLOG', userPlatform: null },
        },
      });
      expect(mixed.json().summary).toEqual({ updated: 1, failed: 1 });
      expect(await libraries.getById(first.id, ownerId)).toMatchObject({
        status: 'BACKLOG',
        completedAt: null,
        userPlatform: null,
        tagIds: [newTag.id],
        collectionIds: [collection.id],
      });
      expect((await libraries.getById(foreign.id, anotherUserId)).status).toBe('PLAYING');
      expect(await sessions.list(first.id, ownerId)).toHaveLength(1);
      expect(
        (
          await app.inject({
            method: 'POST',
            url,
            headers,
            payload: { ids: [first.id], changes: { tagIds: [] } },
          })
        ).json().summary.updated,
      ).toBe(1);
      expect((await libraries.getById(first.id, ownerId)).tagIds).toEqual([]);
      expect((await libraries.getById(first.id, ownerId)).collectionIds).toEqual([collection.id]);
      const queue = await database.libraryEntry.findMany({
        where: { userId: ownerId, status: 'BACKLOG' },
      });
      expect(new Set(queue.map((row) => row.queuePosition)).size).toBe(2);
    } finally {
      await app.close();
      await libraries.remove(first.id, ownerId);
      await libraries.remove(second.id, ownerId);
      await libraries.remove(foreign.id, anotherUserId);
      await organization.remove('collections', collection.id, ownerId);
      await organization.remove('tags', oldTag.id, ownerId);
      await organization.remove('tags', newTag.id, ownerId);
      await organization.remove('tags', foreignTag.id, anotherUserId);
    }
  });

  it('serializes concurrent inserts and moves without duplicate queue positions', async () => {
    const service = library();
    const entries = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        service.create(ownerId, { igdbId: index + 1, status: 'BACKLOG' }),
      ),
    );
    expect(
      entries.map((entry) => entry.queuePosition).sort((a, b) => Number(a) - Number(b)),
    ).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));

    await Promise.all(
      entries.slice(0, 6).map((entry) => service.moveInQueue(entry.id, ownerId, 'down')),
    );
    const queued = await database.libraryEntry.findMany({
      where: { userId: ownerId, status: 'BACKLOG' },
    });
    expect(new Set(queued.map((entry) => entry.queuePosition)).size).toBe(12);

    await Promise.all(
      entries.slice(0, 4).map((entry) => service.update(entry.id, ownerId, { status: 'PLAYING' })),
    );
    await Promise.all(
      entries.slice(0, 4).map((entry) => service.update(entry.id, ownerId, { status: 'BACKLOG' })),
    );
    const restored = await service.list(ownerId);
    expect(new Set(restored.map((entry) => entry.queuePosition)).size).toBe(12);
  });

  it('enforces ownership, preserves HLTB on failure and executes statistics SQL', async () => {
    const service = library();
    const entry = (await service.list(ownerId))[0];
    expect(entry).toBeDefined();
    await expect(
      service.update(entry.id, anotherUserId, { notes: 'wrong owner' }),
    ).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.remove(entry.id, anotherUserId)).rejects.toMatchObject({
      statusCode: 404,
    });
    const refreshed = await service.refreshHltb(entry.id, ownerId);
    expect(refreshed).toMatchObject({ hltbStatus: 'FAILED', hltbMain: 10, hltbMainExtra: 20 });
    const stats = await service.getStats(ownerId);
    expect(stats.totalGames).toBe(12);
    expect(stats.topGenres).toContainEqual({ genre: 'RPG', count: 12 });
  });

  it('repairs legacy duplicate and missing positions before swapping neighbors', async () => {
    const service = library();
    const entries = await Promise.all(
      [1, 2, 3].map((igdbId) => service.create(anotherUserId, { igdbId, status: 'BACKLOG' })),
    );
    await database.libraryEntry.update({
      where: { id: entries[0].id },
      data: { queuePosition: null },
    });
    await database.libraryEntry.update({
      where: { id: entries[1].id },
      data: { queuePosition: 1 },
    });
    await database.libraryEntry.update({
      where: { id: entries[2].id },
      data: { queuePosition: 1 },
    });
    // The null-position entry sorts last; moving it up must normalize and swap.
    await service.moveInQueue(entries[0].id, anotherUserId, 'up');
    const queue = await database.libraryEntry.findMany({
      where: { userId: anotherUserId },
      orderBy: { queuePosition: 'asc' },
    });
    expect(queue.map((entry) => entry.queuePosition)).toEqual([1, 2, 3]);
    expect(queue[1].id).toBe(entries[0].id);
  });

  it('rejects replaced and expired verification tokens and consumes a token only once', async () => {
    const users = new UserRepository(database);
    await database.user.update({
      where: { id: ownerId },
      data: {
        emailVerificationToken: 'replacement-hash',
        emailVerificationExpiresAt: new Date(Date.now() + 60000),
      },
    });
    expect(await users.consumeVerificationToken('old-hash')).toBe(false);
    const consumed = await Promise.all([
      users.consumeVerificationToken('replacement-hash'),
      users.consumeVerificationToken('replacement-hash'),
    ]);
    expect(consumed.sort()).toEqual([false, true]);
    await database.user.update({
      where: { id: ownerId },
      data: {
        emailVerified: false,
        emailVerificationToken: 'expired-hash',
        emailVerificationExpiresAt: new Date(0),
      },
    });
    expect(await users.consumeVerificationToken('expired-hash')).toBe(false);
  });

  it('restores a failed resend without overwriting a newer token', async () => {
    const users = new UserRepository(database);
    const user = await database.user.update({
      where: { id: ownerId },
      data: {
        emailVerified: false,
        emailVerificationToken: 'failed-hash',
      },
    });
    const previous = {
      email: user.email,
      tokenHash: 'previous-hash',
      expiresAt: new Date(Date.now() + 60000),
    };
    expect(await users.restoreVerificationToken(ownerId, 'failed-hash', previous)).toMatchObject({
      count: 1,
    });
    await database.user.update({
      where: { id: ownerId },
      data: { emailVerificationToken: 'newer-hash' },
    });
    expect(await users.restoreVerificationToken(ownerId, 'failed-hash', previous)).toMatchObject({
      count: 0,
    });
    expect(
      (await database.user.findUniqueOrThrow({ where: { id: ownerId } })).emailVerificationToken,
    ).toBe('newer-hash');
  });

  it('issues one active reset token, caps concurrent attempts and consumes resets once', async () => {
    const tokens = new PasswordResetRepository(database);
    await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        tokens.replaceActiveToken(ownerId, `hash-${index}`, new Date(Date.now() + 60000)),
      ),
    );
    const active = await database.passwordResetToken.findMany({
      where: { userId: ownerId, usedAt: null },
    });
    expect(active).toHaveLength(1);
    const attempts = await Promise.all(
      Array.from({ length: 15 }, () => tokens.claimVerificationAttempt(ownerId)),
    );
    expect(attempts.flat()).toHaveLength(10);
    expect(await tokens.claimVerificationAttempt(ownerId)).toEqual([]);

    const fresh = await tokens.replaceActiveToken(
      ownerId,
      'fresh-hash',
      new Date(Date.now() + 60000),
    );
    await tokens.commitVerifiedReset(ownerId, fresh.id, 'new-password-hash');
    await expect(
      tokens.commitVerifiedReset(ownerId, fresh.id, 'replayed-password'),
    ).rejects.toMatchObject({ statusCode: 401 });
    const user = await database.user.findUniqueOrThrow({ where: { id: ownerId } });
    expect(user.passwordHash).toBe('new-password-hash');
    expect(user.sessionVersion).toBe(1);
  });
});
