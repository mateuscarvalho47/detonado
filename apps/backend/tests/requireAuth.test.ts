import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedError } from '@/lib/errors.js';
import { requireAuth } from '@/lib/requireAuth.js';

function makeReq(
  session: { userId?: string; sessionVersion?: number },
  user: { sessionVersion: number } | null,
) {
  const destroy = vi.fn().mockResolvedValue(undefined);
  const findUnique = vi.fn().mockResolvedValue(user);
  const req = {
    session: { ...session, destroy },
    server: { prisma: { user: { findUnique } } },
  } as unknown as FastifyRequest;
  return { req, destroy, findUnique };
}

describe('requireAuth', () => {
  const reply = {} as FastifyReply;

  it('rejects a request without userId and does not read the database', async () => {
    const { req, destroy, findUnique } = makeReq({}, { sessionVersion: 0 });

    await expect(requireAuth(req, reply)).rejects.toThrow(UnauthorizedError);
    expect(findUnique).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });

  it('accepts a legacy session when the stored version is 0', async () => {
    const { req, destroy } = makeReq({ userId: 'user-1' }, { sessionVersion: 0 });

    await requireAuth(req, reply);

    expect(req.userId).toBe('user-1');
    expect(destroy).not.toHaveBeenCalled();
  });

  it('accepts a session whose version matches the user', async () => {
    const { req, destroy } = makeReq(
      { userId: 'user-1', sessionVersion: 2 },
      { sessionVersion: 2 },
    );

    await requireAuth(req, reply);

    expect(req.userId).toBe('user-1');
    expect(destroy).not.toHaveBeenCalled();
  });

  it('destroys the session when the version is behind', async () => {
    const { req, destroy } = makeReq(
      { userId: 'user-1', sessionVersion: 1 },
      { sessionVersion: 2 },
    );

    await expect(requireAuth(req, reply)).rejects.toThrow(UnauthorizedError);
    expect(destroy).toHaveBeenCalledOnce();
    expect(req.userId).toBeUndefined();
  });

  it('destroys the session when the user no longer exists', async () => {
    const { req, destroy } = makeReq({ userId: 'user-1', sessionVersion: 0 }, null);

    await expect(requireAuth(req, reply)).rejects.toThrow(UnauthorizedError);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('does not destroy the session when the database read fails', async () => {
    const { req, destroy, findUnique } = makeReq({ userId: 'user-1', sessionVersion: 0 }, null);
    findUnique.mockRejectedValue(new Error('db down'));

    await expect(requireAuth(req, reply)).rejects.toThrow('db down');
    expect(destroy).not.toHaveBeenCalled();
  });
});
