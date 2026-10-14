import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { describe, expect, it, vi } from 'vitest';
import { savedFilterRoutes } from '@/modules/saved-filter/saved-filter.routes.js';
import csrf from '@/plugins/csrf.js';
import errorHandler from '@/plugins/errorHandler.js';

interface StoredFilter {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

describe('saved filters HTTP', () => {
  it('validates, protects and isolates CRUD by owner', async () => {
    const rows: StoredFilter[] = [];
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    app.decorate('prisma', {
      user: { findUnique: vi.fn().mockResolvedValue({ sessionVersion: 0 }) },
      savedFilter: {
        findMany: vi.fn(async ({ where }) => rows.filter((row) => row.userId === where.userId)),
        findFirst: vi.fn(
          async ({ where }) =>
            rows.find((row) => row.id === where.id && row.userId === where.userId) ?? null,
        ),
        create: vi.fn(async ({ data }) => {
          const row = {
            ...data,
            id: `filter-${rows.length + 1}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          rows.push(row);
          return row;
        }),
        updateManyAndReturn: vi.fn(async ({ where, data }) => {
          const row = rows.find((row) => row.id === where.id && row.userId === where.userId);
          if (!row) return [];
          Object.assign(row, data);
          return [row];
        }),
        deleteMany: vi.fn(async ({ where }) => {
          const index = rows.findIndex((row) => row.id === where.id && row.userId === where.userId);
          if (index < 0) return { count: 0 };
          rows.splice(index, 1);
          return { count: 1 };
        }),
      },
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
      req.session.userId = req.params.id;
      req.session.sessionVersion = 0;
      req.session.csrfToken = 'test-csrf';
      return {};
    });
    await app.register(savedFilterRoutes, { prefix: '/api' });
    try {
      const login = await app.inject({ url: '/test-session/owner' });
      const cookie = String(login.headers['set-cookie']).split(';')[0];
      const headers = { cookie, 'x-csrf-token': 'test-csrf' };
      const base = '/api/library/filters';
      expect((await app.inject({ url: base })).statusCode).toBe(401);
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers: { cookie },
            payload: { name: 'Short', filters: {} },
          })
        ).statusCode,
      ).toBe(403);
      for (const filters of [
        { unexpected: true },
        { statuses: ['BACKLOG', 'BACKLOG'] },
        { maxHours: 0 },
        { maxHours: '10' },
        { includeUnknownDuration: 'yes' },
        { platform: '' },
      ]) {
        expect(
          (
            await app.inject({
              method: 'POST',
              url: base,
              headers,
              payload: { name: 'Test', filters },
            })
          ).statusCode,
        ).toBe(400);
      }
      expect(
        (
          await app.inject({
            method: 'POST',
            url: base,
            headers,
            payload: { name: ' ', filters: {} },
          })
        ).statusCode,
      ).toBe(400);
      const created = await app.inject({
        method: 'POST',
        url: base,
        headers,
        payload: {
          name: '  Curtos  ',
          filters: { statuses: ['BACKLOG'], maxHours: 10, includeUnknownDuration: false },
        },
      });
      expect(created.statusCode).toBe(201);
      expect(created.json().name).toBe('Curtos');
      expect(created.json()).not.toHaveProperty('userId');
      const id = created.json().id;
      expect((await app.inject({ url: base, headers })).json().filters).toHaveLength(1);
      expect(
        (await app.inject({ method: 'PATCH', url: `${base}/${id}`, headers, payload: {} }))
          .statusCode,
      ).toBe(400);
      const updated = await app.inject({
        method: 'PATCH',
        url: `${base}/${id}`,
        headers,
        payload: { name: 'Todos', filters: {} },
      });
      expect(updated.json().filters).toEqual({});
      const otherLogin = await app.inject({ url: '/test-session/other' });
      const otherHeaders = {
        cookie: String(otherLogin.headers['set-cookie']).split(';')[0],
        'x-csrf-token': 'test-csrf',
      };
      expect((await app.inject({ url: base, headers: otherHeaders })).json()).toEqual({
        filters: [],
      });
      expect((await app.inject({ url: `${base}/${id}`, headers: otherHeaders })).statusCode).toBe(
        404,
      );
      expect(
        (
          await app.inject({
            method: 'PATCH',
            url: `${base}/${id}`,
            headers: otherHeaders,
            payload: { name: 'Wrong owner' },
          })
        ).statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: `${base}/${id}`, headers: otherHeaders }))
          .statusCode,
      ).toBe(404);
      expect(
        (await app.inject({ method: 'DELETE', url: `${base}/${id}`, headers })).statusCode,
      ).toBe(204);
      expect((await app.inject({ url: base, headers })).json()).toEqual({ filters: [] });
    } finally {
      await app.close();
    }
  });
});
