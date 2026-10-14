import type { FastifyBaseLogger } from 'fastify';
import { Resend } from 'resend';
import { env } from '@/config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendVerificationEmail(
  to: string,
  token: string,
  logger?: Pick<FastifyBaseLogger, 'error'>,
) {
  const url = `${env.APP_URL}/verify-email?token=${token}`;

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Confirme seu e-mail — Detonado',
    html: `
      <p>Confirme seu e-mail para entrar na sua biblioteca.</p>
      <p><a href="${url}">${url}</a></p>
      <p>O link expira em 24 horas.</p>
    `,
  });

  if (error) {
    logger?.error({ providerCode: error.name }, 'verification email delivery failed');
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  logger?: Pick<FastifyBaseLogger, 'error'>,
) {
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Código de recuperação de senha — Detonado',
    html: `
      <p>Você solicitou a redefinição da sua senha.</p>
      <p>Use o código abaixo para concluir a operação:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;font-family:monospace;">${code}</p>
      <p>O código expira em 15 minutos. Se você não solicitou, ignore este email.</p>
    `,
  });

  if (error) {
    logger?.error({ providerCode: error.name }, 'password reset email delivery failed');
    throw new Error(error.message);
  }
}
