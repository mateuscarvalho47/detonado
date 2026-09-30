import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '@/lib/requireAuth.js';
import { UserRepository } from '@/modules/user/user.repository.js';
import { UserService } from '@/modules/user/user.service.js';
import { issueCsrfToken } from '@/plugins/csrf.js';
import { AuthController } from './auth.controller.js';
import {
  deleteAccountSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  updateAccountSchema,
} from './auth.schema.js';
import { AuthService } from './auth.service.js';

const userResponse = z.object({
  id: z.string(),
  email: z.email(),
  consentedAt: z.date().nullable(),
  createdAt: z.date(),
});

const messageResponse = z.object({ message: z.string() });

export async function authRoutes(app: FastifyInstance) {
  const userRepo = new UserRepository(app.prisma);
  const userService = new UserService(userRepo);
  const authService = new AuthService(userRepo);
  const controller = new AuthController(authService, userService);

  app.post('/auth/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      summary: 'Registrar usuário',
      body: registerSchema,
      response: { 201: messageResponse },
    },
    handler: controller.register,
  });

  app.get('/auth/verify-email', {
    schema: {
      tags: ['auth'],
      summary: 'Verificar email',
      querystring: z.object({ token: z.string().min(1) }),
      response: { 200: messageResponse },
    },
    handler: controller.verifyEmail,
  });

  app.post('/auth/resend-verification', {
    config: { rateLimit: { max: 3, timeWindow: '5 minutes' } },
    schema: {
      tags: ['auth'],
      summary: 'Reenviar email de verificação',
      body: resendVerificationSchema,
      response: { 200: messageResponse },
    },
    handler: controller.resendVerification,
  });

  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    schema: {
      tags: ['auth'],
      summary: 'Login',
      body: loginSchema,
      response: {
        200: z.object({ id: z.string(), email: z.string() }),
      },
    },
    handler: controller.login,
  });

  app.get('/auth/csrf', {
    schema: {
      tags: ['auth'],
      summary: 'Token CSRF da sessão',
      response: { 200: z.object({ token: z.string() }) },
    },
    handler: async (req) => {
      if (!req.session.csrfToken) {
        req.session.csrfToken = issueCsrfToken();
      }
      return { token: req.session.csrfToken };
    },
  });

  app.post('/auth/logout', {
    schema: { tags: ['auth'], summary: 'Logout', response: { 204: z.null() } },
    handler: controller.logout,
  });

  app.get('/auth/me', {
    schema: {
      tags: ['auth'],
      summary: 'Usuário atual',
      security: [{ sessionCookie: [] }],
      response: { 200: userResponse },
    },
    preHandler: requireAuth,
    handler: controller.me,
  });

  app.patch('/auth/account', {
    schema: {
      tags: ['auth'],
      summary: 'Atualizar email ou senha',
      security: [{ sessionCookie: [] }],
      body: updateAccountSchema,
      response: {
        200: z.object({ id: z.string(), email: z.string(), emailVerified: z.boolean() }),
      },
    },
    preHandler: requireAuth,
    handler: controller.updateAccount,
  });

  app.delete('/auth/account', {
    schema: {
      tags: ['auth'],
      summary: 'Excluir conta',
      security: [{ sessionCookie: [] }],
      body: deleteAccountSchema,
      response: { 204: z.null() },
    },
    preHandler: requireAuth,
    handler: controller.deleteAccount,
  });

  app.post('/auth/consent', {
    schema: {
      tags: ['auth'],
      summary: 'Registrar consentimento LGPD',
      security: [{ sessionCookie: [] }],
      response: { 204: z.null() },
    },
    preHandler: requireAuth,
    handler: controller.consent,
  });

  app.get('/auth/export', {
    schema: {
      tags: ['auth'],
      summary: 'Exportar dados pessoais',
      security: [{ sessionCookie: [] }],
    },
    preHandler: requireAuth,
    handler: controller.exportData,
  });
}
