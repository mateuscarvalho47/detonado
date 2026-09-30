import type { PrismaClient } from '@/generated/prisma/client.js';
import { InvalidOrExpiredResetTokenError } from './password-reset.errors.js';

export class PasswordResetRepository {
  constructor(private prisma: PrismaClient) {}

  createToken(userId: string, codeHash: string, expiresAt: Date) {
    return this.prisma.passwordResetToken.create({
      data: { userId, codeHash, expiresAt },
      select: { id: true },
    });
  }

  findActiveTokensByUserId(userId: string) {
    return this.prisma.passwordResetToken.findMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, codeHash: true },
    });
  }

  invalidateActiveForUser(userId: string) {
    return this.prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  // Hash comparison stays outside. These three writes commit together, or not at all.
  async commitVerifiedReset(userId: string, tokenId: string, passwordHash: string) {
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
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
