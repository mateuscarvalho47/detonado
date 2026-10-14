import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendPasswordResetEmail } from '@/lib/email.js';
import { UserRepository } from '@/modules/user/user.repository.js';
import { PasswordResetController } from './password-reset.controller.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import {
  checkPasswordResetSchema,
  requestPasswordResetSchema,
  verifyPasswordResetSchema,
} from './password-reset.schema.js';
import { PasswordResetService } from './password-reset.service.js';

const messageResponse = z.object({ message: z.string() });

export async function passwordResetRoutes(app: FastifyInstance) {
  const userRepo = new UserRepository(app.prisma);
  const tokenRepo = new PasswordResetRepository(app.prisma);
  const service = new PasswordResetService(userRepo, tokenRepo, (to, code) =>
    sendPasswordResetEmail(to, code, app.log),
  );
  const controller = new PasswordResetController(service);

  app.post('/password-reset/request', {
    config: { rateLimit: { max: 5, timeWindow: '5 minutes' } },
    schema: {
      tags: ['password-reset'],
      summary: 'Solicitar código de recuperação de senha',
      body: requestPasswordResetSchema,
      response: { 200: messageResponse },
    },
    handler: controller.request,
  });

  app.post('/password-reset/check', {
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    schema: {
      tags: ['password-reset'],
      summary: 'Validar código de recuperação (sem consumir)',
      body: checkPasswordResetSchema,
      response: { 200: messageResponse },
    },
    handler: controller.check,
  });

  app.post('/password-reset/verify', {
    config: { rateLimit: { max: 10, timeWindow: '5 minutes' } },
    schema: {
      tags: ['password-reset'],
      summary: 'Confirmar código e redefinir senha',
      body: verifyPasswordResetSchema,
      response: { 200: messageResponse },
    },
    handler: controller.verify,
  });
}
