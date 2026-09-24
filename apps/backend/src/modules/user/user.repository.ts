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
            status: true,
            userPlatform: true,
            rating: true,
            hoursPlayed: true,
            notes: true,
            completedAt: true,
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

  updateVerificationToken(userId: string, token: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: token },
      select: { id: true },
    });
  }

  findByVerificationToken(token: string) {
    return this.prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: { id: true, email: true },
    });
  }

  verifyEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerificationToken: null },
      select: { id: true, email: true },
    });
  }

  updatePasswordHash(id: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
      select: { id: true, sessionVersion: true },
    });
  }
}
