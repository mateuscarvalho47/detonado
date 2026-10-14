import { randomInt } from 'node:crypto';
import type { sendPasswordResetEmail } from '@/lib/email.js';
import { EmailDeliveryError } from '@/lib/errors.js';
import { hashPassword, verifyPassword } from '@/lib/hash.js';
import type { UserRepository } from '@/modules/user/user.repository.js';
import { InvalidOrExpiredResetTokenError } from './password-reset.errors.js';
import type { PasswordResetRepository } from './password-reset.repository.js';
import type {
  CheckPasswordResetInput,
  RequestPasswordResetInput,
  VerifyPasswordResetInput,
} from './password-reset.schema.js';

const TOKEN_TTL_MS = 15 * 60_000;

export class PasswordResetService {
  constructor(
    private readonly users: Pick<UserRepository, 'findByEmail'>,
    private readonly tokens: Pick<
      PasswordResetRepository,
      'replaceActiveToken' | 'claimVerificationAttempt' | 'invalidateToken' | 'commitVerifiedReset'
    >,
    private readonly sendEmail: typeof sendPasswordResetEmail,
  ) {}

  async request(input: RequestPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) return;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const token = await this.tokens.replaceActiveToken(user.id, codeHash, expiresAt);

    try {
      await this.sendEmail(user.email, code);
    } catch {
      await this.tokens.invalidateToken(token.id);
      throw new EmailDeliveryError();
    }
  }

  async check(input: CheckPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new InvalidOrExpiredResetTokenError();

    const active = await this.tokens.claimVerificationAttempt(user.id);
    for (const token of active) {
      if (await verifyPassword(token.codeHash, input.code)) return;
    }
    throw new InvalidOrExpiredResetTokenError();
  }

  async verify(input: VerifyPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new InvalidOrExpiredResetTokenError();

    const active = await this.tokens.claimVerificationAttempt(user.id);

    let matchedId: string | null = null;
    for (const token of active) {
      if (await verifyPassword(token.codeHash, input.code)) {
        matchedId = token.id;
        break;
      }
    }
    if (!matchedId) throw new InvalidOrExpiredResetTokenError();

    const newHash = await hashPassword(input.password);
    await this.tokens.commitVerifiedReset(user.id, matchedId, newHash);
  }
}
