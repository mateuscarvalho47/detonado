import { libraryImportRowSchema } from '@detonado/shared';
import { z } from 'zod';

export {
  commitLibraryImportSchema,
  type LibraryImportRow,
  libraryImportRowSchema,
  previewLibraryImportSchema,
} from '@detonado/shared';
export const previewImportResponseSchema = z.object({
  rows: z.array(
    z.object({
      index: z.number(),
      input: libraryImportRowSchema.nullable(),
      state: z.enum(['READY', 'DUPLICATE', 'NEEDS_MATCH', 'INVALID']),
      error: z.string().nullable(),
    }),
  ),
});
export const commitImportResultSchema = z.object({
  index: z.number(),
  igdbId: z.number().optional(),
  entryId: z.string().optional(),
  state: z.enum(['ADDED', 'UPDATED', 'SKIPPED', 'FAILED']),
  error: z.string().optional(),
});
export const commitImportResponseSchema = z.object({
  results: z.array(commitImportResultSchema),
  summary: z.object({
    added: z.number(),
    updated: z.number(),
    skipped: z.number(),
    failed: z.number(),
  }),
});
export type ImportResult = z.infer<typeof commitImportResultSchema>;
