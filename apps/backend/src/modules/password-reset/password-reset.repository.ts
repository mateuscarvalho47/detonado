import type { PrismaClient } from '@/generated/prisma/client.js';
import { InvalidOrExpiredResetTokenError } from './password-reset.errors.js';

export class PasswordResetRepository {
  constructor(private prisma: PrismaClient) {}

  async replaceActiveToken(userId: string, codeHash: string, expiresAt: Date) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      await transaction.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      return transaction.passwordResetToken.create({
        data: { userId, codeHash, expiresAt },
        select: { id: true },
      });
    });
  }

  claimVerificationAttempt(userId: string) {
    // Check and verify share the same ten-attempt budget, even across IPs.
    return this.prisma.passwordResetToken.updateManyAndReturn({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() }, attempts: { lt: 10 } },
      data: { attempts: { increment: 1 } },
      select: { id: true, codeHash: true },
    });
  }

  invalidateToken(id: string) {
    return this.prisma.passwordResetToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  // Hash comparison stays outside. These three writes commit together, or not at all.
  async commitVerifiedReset(userId: string, tokenId: string, passwordHash: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
      const now = new Date();
      const marked = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, userId, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (marked.count !== 1) throw new InvalidOrExpiredResetTokenError();

      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });
    });
  }
}
