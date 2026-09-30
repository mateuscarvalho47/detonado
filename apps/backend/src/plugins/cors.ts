import fastifyCors from '@fastify/cors';
import fp from 'fastify-plugin';
import { env } from '@/config/env.js';

export default fp(async (app) => {
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-csrf-token'],
  });
});
