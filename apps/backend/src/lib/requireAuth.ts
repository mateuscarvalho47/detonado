import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '@/lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function requireAuth(req: FastifyRequest, _reply: FastifyReply) {
  if (!req.session.userId) throw new UnauthorizedError();

  const user = await req.server.prisma.user.findUnique({
    where: { id: req.session.userId },
    select: { sessionVersion: true },
  });
  const sessionVersion = req.session.sessionVersion ?? 0;
  if (!user || sessionVersion !== user.sessionVersion) {
    await req.session.destroy();
    throw new UnauthorizedError();
  }

  req.userId = req.session.userId;
}
