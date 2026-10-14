import {
  createLibraryEntryInput,
  hltbStatusSchema,
  type LibraryStatus,
  LibraryStatusEnum,
  libraryStatsSchema,
  updateLibraryEntryInput,
} from '@detonado/shared';
import { z } from 'zod';

export type { CreateLibraryEntryInput, UpdateLibraryEntryInput } from '@detonado/shared';
export { type LibraryStats, type LibraryStatus, LibraryStatusEnum } from '@detonado/shared';
export { createLibraryEntryInput, libraryStatsSchema, updateLibraryEntryInput };

// Backend-only: hoursPlayed uses preprocess to coerce Prisma Decimal → number
export const libraryEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  igdbId: z.number(),
  name: z.string(),
  coverUrl: z.string().nullable(),
  genres: z.array(z.string()),
  platforms: z.array(z.string()),
  status: LibraryStatusEnum,
  userPlatform: z.string().nullable(),
  rating: z.number().nullable(),
  lastSessionAt: z.date().nullable(),
  baseHours: z.preprocess((v) => (v != null ? Number(v) : null), z.number().nullable()),
  hoursPlayed: z.preprocess((v) => (v != null ? Number(v) : null), z.number().nullable()),
  notes: z.string().nullable(),
  completedAt: z.date().nullable(),
  hltbMain: z.number().nullable(),
  hltbMainExtra: z.number().nullable(),
  hltbCompletionist: z.number().nullable(),
  hltbStatus: hltbStatusSchema.nullable(),
  queuePosition: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LibraryEntry = z.infer<typeof libraryEntrySchema>;

export interface LibraryEntryChanges {
  status?: LibraryStatus;
  userPlatform?: string | null;
  rating?: number | null;
  baseHours?: number | null;
  hoursPlayed?: number | null;
  notes?: string | null;
  completedAt?: Date | null;
  queuePosition?: number | null;
}
