import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreateLibraryEntryInput, UpdateLibraryEntryInput } from './library.schema.js';
import type { LibraryService } from './library.service.js';

export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  list = async (req: FastifyRequest, reply: FastifyReply) => {
    const entries = await this.library.list(req.userId);
    return reply.send(entries);
  };

  getById = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entry = await this.library.getById(req.params.id, req.userId);
    return reply.send(entry);
  };

  create = async (req: FastifyRequest<{ Body: CreateLibraryEntryInput }>, reply: FastifyReply) => {
    const entry = await this.library.create(req.userId, req.body);
    return reply.code(201).send(entry);
  };

  update = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateLibraryEntryInput }>,
    reply: FastifyReply,
  ) => {
    const entry = await this.library.update(req.params.id, req.userId, req.body);
    return reply.send(entry);
  };

  remove = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.library.remove(req.params.id, req.userId);
    return reply.code(204).send();
  };

  moveQueue = async (
    req: FastifyRequest<{ Params: { id: string }; Body: { direction: 'up' | 'down' } }>,
    reply: FastifyReply,
  ) => {
    const entry = await this.library.moveInQueue(req.params.id, req.userId, req.body.direction);
    return reply.send(entry);
  };

  refreshHltb = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entry = await this.library.refreshHltb(req.params.id, req.userId);
    return reply.send(entry);
  };

  getStats = async (req: FastifyRequest, reply: FastifyReply) => {
    const stats = await this.library.getStats(req.userId);
    return reply.send(stats);
  };
}
