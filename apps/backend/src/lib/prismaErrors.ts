import { Prisma } from '@/generated/prisma/client.js';
import { type AppError, NotFoundError } from '@/lib/errors.js';
import { EmailAlreadyTakenError } from '@/modules/auth/auth.errors.js';
import { LibraryEntryAlreadyExistsError } from '@/modules/library/library.errors.js';

function constraintTargets(meta: unknown): string[] {
  if (!meta || typeof meta !== 'object' || !('target' in meta)) return [];
  const target = (meta as { target: unknown }).target;
  if (Array.isArray(target)) return target.map((part) => String(part));
  if (typeof target === 'string') return [target];
  return [];
}

function isUserEmail(targets: string[]): boolean {
  if (targets.some((target) => target === 'email')) return true;
  return targets.some((target) => /(^|_)email_key$/i.test(target));
}

function isLibraryGame(targets: string[]): boolean {
  const hasUser = targets.some((target) => target === 'userId' || target.includes('userId'));
  const hasIgdb = targets.some((target) => target === 'igdbId' || target.includes('igdbId'));
  return hasUser && hasIgdb;
}

function knownRequestError(err: unknown): Prisma.PrismaClientKnownRequestError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return err;
  if (err instanceof Error && err.cause) return knownRequestError(err.cause);
  return null;
}

// Maps the unique and missing-row errors Postgres already decided.
// Any other Prisma code stays unmapped so a real bug still surfaces as 500.
export function mapPrismaWriteError(err: unknown): AppError | null {
  const known = knownRequestError(err);
  if (!known) return null;
  if (known.code === 'P2025') return new NotFoundError('Registro');
  if (known.code !== 'P2002') return null;

  const targets = constraintTargets(known.meta);
  if (isLibraryGame(targets)) return new LibraryEntryAlreadyExistsError();
  if (isUserEmail(targets)) return new EmailAlreadyTakenError();
  return null;
}
