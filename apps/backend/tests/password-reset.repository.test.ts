import { describe, expect, it, vi } from 'vitest';
import { InvalidOrExpiredResetTokenError } from '@/modules/password-reset/password-reset.errors.js';
import { PasswordResetRepository } from '@/modules/password-reset/password-reset.repository.js';

function makeDb(markCount: number) {
  const calls: string[] = [];
  const tx = {
    passwordResetToken: {
      updateMany: vi.fn(async (args: { where: { id?: string } }) => {
        calls.push(args.where.id ? 'mark' : 'invalidate');
        return { count: args.where.id ? markCount : 1 };
      }),
    },
    user: {
      update: vi.fn(async () => {
        calls.push('password');
        return { id: 'user-1' };
      }),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<void>) => fn(tx)),
  };
  return { prisma, tx, calls };
}

describe('PasswordResetRepository.commitVerifiedReset', () => {
  it('marks the code, stores the hash, and invalidates the rest in one transaction', async () => {
    const db = makeDb(1);
    const repo = new PasswordResetRepository(db.prisma as never);

    await repo.commitVerifiedReset('user-1', 'token-1', 'hashed-password');

    expect(db.prisma.$transaction).toHaveBeenCalledOnce();
    expect(db.calls).toEqual(['mark', 'password', 'invalidate']);
    expect(db.tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'token-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
    expect(db.tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'hashed-password', sessionVersion: { increment: 1 } },
    });
    expect(db.tx.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('stops before the password write when the code is no longer active', async () => {
    const db = makeDb(0);
    const repo = new PasswordResetRepository(db.prisma as never);

    await expect(
      repo.commitVerifiedReset('user-1', 'token-1', 'hashed-password'),
    ).rejects.toBeInstanceOf(InvalidOrExpiredResetTokenError);
    expect(db.calls).toEqual(['mark']);
    expect(db.tx.user.update).not.toHaveBeenCalled();
  });
});
