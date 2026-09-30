import { randomInt } from 'node:crypto';
import { sendPasswordResetEmail } from '@/lib/email.js';
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
    private users: UserRepository,
    private tokens: PasswordResetRepository,
  ) {}

  async request(input: RequestPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) return;

    await this.tokens.invalidateActiveForUser(user.id);

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.tokens.createToken(user.id, codeHash, expiresAt);

    try {
      await sendPasswordResetEmail(user.email, code);
    } catch {
      await this.tokens.invalidateActiveForUser(user.id);
      throw new EmailDeliveryError();
    }
  }

  async check(input: CheckPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new InvalidOrExpiredResetTokenError();

    const active = await this.tokens.findActiveTokensByUserId(user.id);
    for (const t of active) {
      if (await verifyPassword(t.codeHash, input.code)) return;
    }
    throw new InvalidOrExpiredResetTokenError();
  }

  async verify(input: VerifyPasswordResetInput) {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new InvalidOrExpiredResetTokenError();

    const active = await this.tokens.findActiveTokensByUserId(user.id);

    let matchedId: string | null = null;
    for (const t of active) {
      if (await verifyPassword(t.codeHash, input.code)) {
        matchedId = t.id;
        break;
      }
    }
    if (!matchedId) throw new InvalidOrExpiredResetTokenError();

    const newHash = await hashPassword(input.password);
    await this.tokens.commitVerifiedReset(user.id, matchedId, newHash);
  }
}
