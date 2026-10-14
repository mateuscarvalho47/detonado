import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { ForbiddenError } from '@/lib/errors.js';
import type { SteamCache } from '@/lib/steam/client.js';

export const STEAM_AUTHORIZATION_VERSION = '2026-10-14';
const grantSchema = z.object({
  userId: z.string(),
  version: z.literal(STEAM_AUTHORIZATION_VERSION),
  acceptedAt: z.number(),
});
const LIFETIME_SECONDS = 7 * 24 * 60 * 60;

// Independent server-side grant prevents a late session save from undoing revocation.
export class SteamAuthorization {
  constructor(private readonly cache: SteamCache & { del(key: string): Promise<unknown> }) {}

  async grant(userId: string, version?: string) {
    if (version !== STEAM_AUTHORIZATION_VERSION)
      throw new ForbiddenError('Leia e autorize a consulta Steam antes de conectar.');
    const token = randomBytes(32).toString('hex');
    await this.cache.set(
      `steam:authorization:${token}`,
      JSON.stringify({ userId, version, acceptedAt: Date.now() }),
      { EX: LIFETIME_SECONDS },
    );
    return token;
  }

  async active(userId: string, token?: string) {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
    const raw = await this.cache.get(`steam:authorization:${token}`);
    if (!raw) return false;
    try {
      const parsed = grantSchema.safeParse(JSON.parse(raw));
      return (
        parsed.success &&
        parsed.data.userId === userId &&
        Date.now() - parsed.data.acceptedAt < LIFETIME_SECONDS * 1000
      );
    } catch {
      return false;
    }
  }

  async require(userId: string, token?: string) {
    if (!(await this.active(userId, token)))
      throw new ForbiddenError('Autorize a consulta Steam novamente em Configurações.');
  }

  async revoke(token?: string) {
    if (token) await this.cache.del(`steam:authorization:${token}`);
  }
}
