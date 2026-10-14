import type { PrismaClient } from '@/generated/prisma/client.js';

export interface AccountChanges {
  email?: string;
  passwordHash?: string;
  emailVerificationToken?: string | null;
  emailVerificationExpiresAt?: Date | null;
  emailVerified?: boolean;
  sessionVersion?: { increment: number };
}

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, createdAt: true },
    });
  }

  findByEmailWithHash(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        sessionVersion: true,
      },
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, consentedAt: true, createdAt: true },
    });
  }

  recordConsent(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { consentedAt: new Date() },
      select: { id: true },
    });
  }

  create(data: {
    email: string;
    passwordHash: string;
    emailVerificationToken: string;
    emailVerificationExpiresAt: Date;
    consentedAt: Date;
  }) {
    return this.prisma.user.create({
      data,
      select: { id: true, email: true, createdAt: true },
    });
  }

  updateAccount(userId: string, changes: AccountChanges) {
    return this.prisma.user.update({
      where: { id: userId },
      data: changes,
      select: { id: true, email: true, emailVerified: true, sessionVersion: true },
    });
  }

  findByIdWithHash(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        emailVerified: true,
        sessionVersion: true,
      },
    });
  }

  deleteById(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  findByIdWithLibrary(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        consentedAt: true,
        createdAt: true,
        libraryEntries: {
          select: {
            igdbId: true,
            name: true,
            coverUrl: true,
            genres: true,
            platforms: true,
            status: true,
            userPlatform: true,
            rating: true,
            hoursPlayed: true,
            notes: true,
            completedAt: true,
            hltbMain: true,
            hltbMainExtra: true,
            hltbCompletionist: true,
            hltbStatus: true,
            queuePosition: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  findByEmailForResend(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerificationToken: true,
        emailVerificationExpiresAt: true,
      },
    });
  }

  updateVerificationToken(userId: string, token: string, expiresAt: Date, email: string) {
    return this.prisma.user.update({
      where: { id: userId, email, emailVerified: false },
      data: { emailVerificationToken: token, emailVerificationExpiresAt: expiresAt },
      select: { id: true },
    });
  }

  restoreVerificationToken(
    userId: string,
    failedTokenHash: string,
    previous: { email: string; tokenHash: string | null; expiresAt: Date | null },
  ) {
    // A failed delivery must not undo a newer resend or email change.
    return this.prisma.user.updateMany({
      where: {
        id: userId,
        email: previous.email,
        emailVerified: false,
        emailVerificationToken: failedTokenHash,
      },
      data: {
        emailVerificationToken: previous.tokenHash,
        emailVerificationExpiresAt: previous.expiresAt,
      },
    });
  }

  async consumeVerificationToken(tokenHash: string): Promise<boolean> {
    // Check validity and consume the same token in one write.
    const result = await this.prisma.user.updateMany({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: { gt: new Date() },
        emailVerified: false,
      },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    return result.count === 1;
  }
}
