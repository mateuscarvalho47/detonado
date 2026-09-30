import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { env } from '@/config/env.js';

export default fp(async (app) => {
  if (env.NODE_ENV === 'production') return;

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Detonado',
        description:
          'Biblioteca pessoal de jogos. POST, PATCH e DELETE exigem o header x-csrf-token.',
        version: '0.1.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'sessionId',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });
});
