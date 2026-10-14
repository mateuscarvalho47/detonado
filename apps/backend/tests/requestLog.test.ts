import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { serializeRequest } from '@/lib/requestLog.js';

describe('request logging', () => {
  it('does not persist verification tokens or cookies in request logs', async () => {
    const lines: string[] = [];
    const app = Fastify({
      logger: {
        serializers: { req: serializeRequest },
        stream: {
          write: (line) => {
            lines.push(line);
          },
        },
      },
    });
    app.get('/verify-email', async () => ({ ok: true }));
    try {
      await app.inject({
        method: 'GET',
        url: '/verify-email?token=private-token',
        headers: { cookie: 'sessionId=private-cookie' },
      });
      const logs = lines.join('');
      expect(logs).toContain('/verify-email');
      expect(logs).not.toContain('private-token');
      expect(logs).not.toContain('private-cookie');
    } finally {
      await app.close();
    }
  });
});
