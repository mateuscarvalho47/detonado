import type { PrismaClient } from '@/generated/prisma/client.js';

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

  updateAccount(
    userId: string,
    data: {
      email?: string;
      passwordHash?: string;
      emailVerificationToken?: string | null;
      emailVerificationExpiresAt?: Date | null;
      emailVerified?: boolean;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: data.passwordHash ? { ...data, sessionVersion: { increment: 1 } } : data,
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
      select: { id: true, email: true, emailVerified: true },
    });
  }

  updateVerificationToken(userId: string, token: string, expiresAt: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token, emailVerificationExpiresAt: expiresAt },
      select: { id: true },
    });
  }

  findByVerificationToken(token: string) {
    return this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: { id: true, email: true, emailVerificationExpiresAt: true },
    });
  }

  verifyEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
      select: { id: true, email: true },
    });
  }
}
