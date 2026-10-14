import type { FastifyRequest } from 'fastify';

export function serializeRequest(request: FastifyRequest) {
  return {
    method: request.method,
    // Verification tokens and search terms must not be persisted in request logs.
    url: request.url.split('?')[0],
    hostname: request.hostname,
    remoteAddress: request.ip,
  };
}
