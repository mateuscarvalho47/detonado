import { randomBytes, timingSafeEqual } from 'node:crypto';
import fp from 'fastify-plugin';
import { ForbiddenError } from '@/lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function issueCsrfToken() {
  return randomBytes(32).toString('hex');
}

export function csrfTokensMatch(
  expected: string | undefined,
  header: string | string[] | undefined,
) {
  if (!expected || typeof header !== 'string') return false;
  const provided = Buffer.from(header);
  const stored = Buffer.from(expected);
  if (provided.length === 0 || provided.length !== stored.length) return false;
  return timingSafeEqual(provided, stored);
}

export default fp(async (app) => {
  app.addHook('onRequest', async (req) => {
    if (SAFE_METHODS.has(req.method)) return;
    if (!csrfTokensMatch(req.session.csrfToken, req.headers['x-csrf-token'])) {
      throw new ForbiddenError('Sessão expirada. Atualize a página e tente de novo.');
    }
  });
});
