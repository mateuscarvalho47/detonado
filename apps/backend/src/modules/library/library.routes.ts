import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { GameService } from '@/modules/game/game.service.js';
import { LibraryController } from './library.controller.js';
import { LibraryRepository } from './library.repository.js';
import {
  CreateLibraryEntryInput,
  LibraryEntrySchema,
  LibraryStatsSchema,
  UpdateLibraryEntryInput,
} from './library.schema.js';
import { LibraryService } from './library.service.js';

const idParam = z.object({ id: z.cuid2() });

export async function libraryRoutes(app: FastifyInstance) {
  const repo = new LibraryRepository(app.prisma);
  const games = new GameService(app.igdb, app.redis, app.hltb);
  const service = new LibraryService(repo, games);
  const controller = new LibraryController(service);

  const opts = {
    preHandler: requireAuth,
    schema: { tags: ['library'], security: [{ sessionCookie: [] }] },
  };

  app.post('/library', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Adicionar jogo à biblioteca',
      body: CreateLibraryEntryInput,
      response: { 201: LibraryEntrySchema },
    },
    handler: controller.create,
  });

  app.get('/library', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Listar biblioteca do usuário',
      response: { 200: z.array(LibraryEntrySchema) },
    },
    handler: controller.list,
  });

  app.get('/library/stats', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Estatísticas da biblioteca do usuário',
      response: { 200: LibraryStatsSchema },
    },
    handler: controller.getStats,
  });

  app.get('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Buscar entrada da biblioteca',
      params: idParam,
      response: { 200: LibraryEntrySchema },
    },
    handler: controller.getById,
  });

  app.post('/library/:id/queue', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Mover um jogo na fila',
      params: idParam,
      body: z.object({ direction: z.enum(['up', 'down']) }),
      response: { 200: LibraryEntrySchema },
    },
    handler: controller.moveQueue,
  });

  app.post('/library/:id/hltb', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Buscar de novo os tempos do HowLongToBeat',
      params: idParam,
      response: { 200: LibraryEntrySchema },
    },
    handler: controller.refreshHltb,
  });

  app.patch('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Atualizar entrada da biblioteca',
      params: idParam,
      body: UpdateLibraryEntryInput,
      response: { 200: LibraryEntrySchema },
    },
    handler: controller.update,
  });

  app.delete('/library/:id', {
    ...opts,
    schema: {
      ...opts.schema,
      summary: 'Remover jogo da biblioteca',
      params: idParam,
      response: { 204: z.null() },
    },
    handler: controller.remove,
  });
}
