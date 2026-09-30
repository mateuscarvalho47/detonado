import { z } from 'zod';
import { resolveTrustProxy } from '@/lib/trustProxy.js';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  CORS_ORIGIN: z.url(),
  IGDB_CLIENT_ID: z.string().min(1),
  IGDB_CLIENT_SECRET: z.string().min(1),
  IGDB_TIMEOUT_MS: z.coerce.number().default(5000),
  HLTB_TIMEOUT_MS: z.coerce.number().default(5000),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().default('onboarding@resend.dev'),
  APP_URL: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.preprocess(
    (value) => {
      try {
        return resolveTrustProxy(value, process.env.NODE_ENV);
      } catch {
        return value;
      }
    },
    z.union([z.boolean(), z.number().int().nonnegative()]),
  ),
});

export const env = envSchema.parse(process.env);
