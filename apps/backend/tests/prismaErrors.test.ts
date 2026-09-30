import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { Prisma } from '@/generated/prisma/client.js';
import { mapPrismaWriteError } from '@/lib/prismaErrors.js';
import { EmailAlreadyTakenError } from '@/modules/auth/auth.errors.js';
import { LibraryEntryAlreadyExistsError } from '@/modules/library/library.errors.js';
import errorHandler from '@/plugins/errorHandler.js';

function known(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('write failed', {
    code,
    clientVersion: 'test',
    meta,
  });
}

describe('mapPrismaWriteError', () => {
  it('maps a duplicate email to the account conflict', () => {
    expect(mapPrismaWriteError(known('P2002', { target: ['email'] }))).toBeInstanceOf(
      EmailAlreadyTakenError,
    );
    expect(mapPrismaWriteError(known('P2002', { target: 'User_email_key' }))).toBeInstanceOf(
      EmailAlreadyTakenError,
    );
  });

  it('maps a duplicate library game to the library conflict', () => {
    expect(mapPrismaWriteError(known('P2002', { target: ['userId', 'igdbId'] }))).toBeInstanceOf(
      LibraryEntryAlreadyExistsError,
    );
    expect(
      mapPrismaWriteError(known('P2002', { target: 'LibraryEntry_userId_igdbId_key' })),
    ).toBeInstanceOf(LibraryEntryAlreadyExistsError);
  });

  it('maps a missing required row to not found', () => {
    expect(mapPrismaWriteError(known('P2025'))).toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  });

  it('leaves unrelated unique keys and other prisma codes alone', () => {
    expect(mapPrismaWriteError(known('P2002', { target: ['emailVerificationToken'] }))).toBeNull();
    expect(mapPrismaWriteError(known('P2003', { target: ['userId'] }))).toBeNull();
    expect(mapPrismaWriteError(new Error('boom'))).toBeNull();
  });

  it('reads a prisma error wrapped as a cause', () => {
    const wrapped = new Error('wrapped', { cause: known('P2002', { target: ['email'] }) });
    expect(mapPrismaWriteError(wrapped)).toBeInstanceOf(EmailAlreadyTakenError);
  });
});

describe('error handler', () => {
  it('turns a duplicate email into 409 and leaves other prisma errors as 500', async () => {
    const app = Fastify();
    await app.register(errorHandler);
    app.get('/email', async () => {
      throw known('P2002', { target: ['email'] });
    });
    app.get('/other', async () => {
      throw known('P2003', { target: ['userId'] });
    });

    const email = await app.inject({ method: 'GET', url: '/email' });
    const other = await app.inject({ method: 'GET', url: '/other' });

    expect(email.statusCode).toBe(409);
    expect(email.json().error.code).toBe('CONFLICT');
    expect(other.statusCode).toBe(500);
    expect(other.json().error.code).toBe('INTERNAL');
    await app.close();
  });
});
