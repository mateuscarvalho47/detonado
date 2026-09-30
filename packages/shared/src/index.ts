import { z } from 'zod';

// Normaliza emails: trim + lowercase antes de validar formato
export const emailField = z.preprocess(
  (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v),
  z.email(),
);

// Auth
export const registerSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(100),
  consent: z.literal(true, { error: 'Você precisa aceitar os termos para continuar' }),
});

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(100),
});

export const resendVerificationSchema = z.object({
  email: emailField,
});

export const updateAccountSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    email: emailField.optional(),
    newPassword: z.string().min(8).max(100).optional(),
  })
  .refine((d) => d.email !== undefined || d.newPassword !== undefined, {
    message: 'Informe pelo menos um campo para atualizar',
  });

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Senha obrigatória para confirmar a exclusão'),
});

export const requestPasswordResetSchema = z.object({
  email: emailField,
});

export const checkPasswordResetSchema = z.object({
  email: emailField,
  code: z.string().regex(/^\d{6}$/, 'O código deve ter 6 dígitos'),
});

export const verifyPasswordResetSchema = z
  .object({
    email: emailField,
    code: z.string().regex(/^\d{6}$/, 'O código deve ter 6 dígitos'),
    password: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type CheckPasswordResetInput = z.infer<typeof checkPasswordResetSchema>;
export type VerifyPasswordResetInput = z.infer<typeof verifyPasswordResetSchema>;

// Library
export const LibraryStatusEnum = z.enum([
  'WISHLIST',
  'BACKLOG',
  'PLAYING',
  'PAUSED',
  'COMPLETED',
  'DROPPED',
]);

export type LibraryStatus = z.infer<typeof LibraryStatusEnum>;

// Hours and a rating belong to these statuses. Queue rows may still store both;
// library stats ignore them.
export const PROGRESS_STATUSES = ['PLAYING', 'PAUSED', 'COMPLETED', 'DROPPED'] as const;

// Decimal(6, 1) on LibraryEntry.hoursPlayed.
export const HOURS_MAX = 99999.9;
export const NOTES_MAX = 4000;

const calendarDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Data inválida');

function roundHours(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return value;
  return Math.round(numeric * 10) / 10;
}

export const createLibraryEntryInput = z.object({
  igdbId: z.number().int().positive(),
  status: LibraryStatusEnum,
  userPlatform: z.string().optional(),
});

export const updateLibraryEntryInput = z
  .object({
    status: LibraryStatusEnum,
    userPlatform: z.string().nullable(),
    rating: z.preprocess(
      (v) => (v != null ? Math.round(Number(v)) : null),
      z.number().int().min(0).max(10).nullable(),
    ),
    hoursPlayed: z.preprocess(roundHours, z.number().min(0).max(HOURS_MAX).nullable()),
    notes: z.string().max(NOTES_MAX).nullable(),
    completedAt: calendarDateField.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'At least one field required' });

export type CreateLibraryEntryInput = z.infer<typeof createLibraryEntryInput>;
export type UpdateLibraryEntryInput = z.infer<typeof updateLibraryEntryInput>;

export const libraryStatsSchema = z.object({
  totalGames: z.number(),
  totalHours: z.number(),
  countByStatus: z.record(LibraryStatusEnum, z.number()),
  topGenres: z.array(z.object({ genre: z.string(), count: z.number() })),
  topPlatforms: z.array(z.object({ platform: z.string(), count: z.number() })),
  ratingDistribution: z.array(z.object({ rating: z.number(), count: z.number() })),
  completedTimeline: z.array(z.object({ month: z.string(), count: z.number() })),
});

export type LibraryStats = z.infer<typeof libraryStatsSchema>;

// Game
export const SEARCH_QUERY_MAX = 100;

export const searchQuerySchema = z.object({
  q: z.string().min(2).max(SEARCH_QUERY_MAX),
});

export const hltbInfoSchema = z
  .object({
    mainHours: z.number().nullable(),
    mainExtraHours: z.number().nullable(),
    completionistHours: z.number().nullable(),
  })
  .nullable();

export type HltbInfo = z.infer<typeof hltbInfoSchema>;

export const gameSearchResultSchema = z.object({
  igdbId: z.number(),
  name: z.string(),
  coverUrl: z.string().optional(),
  releaseYear: z.number().optional(),
  platforms: z.array(z.string()),
  genres: z.array(z.string()),
});

export const hltbStatusSchema = z.enum(['FOUND', 'MISS', 'FAILED']);

export type HltbStatus = z.infer<typeof hltbStatusSchema>;

export const gameDetailSchema = gameSearchResultSchema.extend({
  summary: z.string().optional(),
  hltb: hltbInfoSchema.optional(),
  hltbStatus: hltbStatusSchema.optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type GameSearchResult = z.infer<typeof gameSearchResultSchema>;
export type GameDetail = z.infer<typeof gameDetailSchema>;
