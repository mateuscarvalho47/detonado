import { createHash, randomBytes } from 'node:crypto';
import { sendVerificationEmail } from '@/lib/email.js';
import { EmailDeliveryError, UnauthorizedError } from '@/lib/errors.js';
import { hashPassword, verifyPassword } from '@/lib/hash.js';
import type { UserRepository } from '@/modules/user/user.repository.js';
import {
  EmailAlreadyTakenError,
  EmailAlreadyVerifiedError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidVerificationTokenError,
} from './auth.errors.js';
import type {
  DeleteAccountInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  UpdateAccountInput,
} from './auth.schema.js';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function hashVerificationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function issueVerification() {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashVerificationToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  };
}

export class AuthService {
  constructor(private users: UserRepository) {}

  async register(input: RegisterInput) {
    const exists = await this.users.findByEmail(input.email);
    if (exists) throw new EmailAlreadyTakenError();

    const passwordHash = await hashPassword(input.password);
    const verification = issueVerification();

    const user = await this.users.create({
      email: input.email,
      passwordHash,
      emailVerificationToken: verification.tokenHash,
      emailVerificationExpiresAt: verification.expiresAt,
      consentedAt: new Date(),
    });

    try {
      await sendVerificationEmail(input.email, verification.token);
    } catch {
      try {
        await this.users.deleteById(user.id);
      } catch (rollbackErr) {
        console.error('[auth] failed to roll back user after email delivery error', rollbackErr);
      }
      throw new EmailDeliveryError();
    }

    return user;
  }

  async login(input: LoginInput) {
    const user = await this.users.findByEmailWithHash(input.email);
    if (!user) throw new InvalidCredentialsError();

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new InvalidCredentialsError();

    if (!user.emailVerified) throw new EmailNotVerifiedError();

    return { id: user.id, email: user.email, sessionVersion: user.sessionVersion ?? 0 };
  }

  async verifyEmail(token: string) {
    const user = await this.users.findByVerificationToken(hashVerificationToken(token));
    const expiresAt = user?.emailVerificationExpiresAt;
    if (!user || !expiresAt || expiresAt.getTime() <= Date.now()) {
      throw new InvalidVerificationTokenError();
    }

    return this.users.verifyEmail(user.id);
  }

  async resendVerification(input: ResendVerificationInput) {
    const user = await this.users.findByEmailForResend(input.email);

    // Always return success to avoid user enumeration
    if (!user) return;
    if (user.emailVerified) throw new EmailAlreadyVerifiedError();

    const verification = issueVerification();
    await this.users.updateVerificationToken(
      user.id,
      verification.tokenHash,
      verification.expiresAt,
    );

    try {
      await sendVerificationEmail(user.email, verification.token);
    } catch {
      throw new EmailDeliveryError();
    }
  }

  async updateAccount(userId: string, input: UpdateAccountInput) {
    const user = await this.users.findByIdWithHash(userId);
    if (!user) throw new UnauthorizedError('Sessão inválida');

    const ok = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!ok) throw new UnauthorizedError('Senha atual incorreta');

    const updates: Parameters<UserRepository['updateAccount']>[1] = {};

    if (input.email && input.email !== user.email) {
      const taken = await this.users.findByEmail(input.email);
      if (taken) throw new EmailAlreadyTakenError();
      const verification = issueVerification();
      try {
        await sendVerificationEmail(input.email, verification.token);
      } catch {
        throw new EmailDeliveryError();
      }
      updates.email = input.email;
      updates.emailVerified = false;
      updates.emailVerificationToken = verification.tokenHash;
      updates.emailVerificationExpiresAt = verification.expiresAt;
    }

    if (input.newPassword) {
      updates.passwordHash = await hashPassword(input.newPassword);
    }

    return this.users.updateAccount(userId, updates);
  }

  async deleteAccount(userId: string, input: DeleteAccountInput) {
    const user = await this.users.findByIdWithHash(userId);
    if (!user) throw new UnauthorizedError('Sessão inválida');

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedError('Senha incorreta');

    await this.users.deleteById(userId);
  }

  async exportData(userId: string) {
    const data = await this.users.findByIdWithLibrary(userId);
    if (!data) throw new UnauthorizedError('Sessão inválida');
    return data;
  }
}
