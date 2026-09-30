import {
  createLibraryEntryInput,
  LibraryStatusEnum,
  libraryStatsSchema,
  updateLibraryEntryInput,
} from '@detonado/shared';
import { z } from 'zod';

export { type LibraryStats, type LibraryStatus, LibraryStatusEnum } from '@detonado/shared';

// PascalCase aliases keep backward compat with routes and tests
export const CreateLibraryEntryInput = createLibraryEntryInput;
export const UpdateLibraryEntryInput = updateLibraryEntryInput;
export const LibraryStatsSchema = libraryStatsSchema;

export type CreateLibraryEntryInput = z.infer<typeof CreateLibraryEntryInput>;
export type UpdateLibraryEntryInput = z.infer<typeof UpdateLibraryEntryInput>;

// Backend-only: hoursPlayed uses preprocess to coerce Prisma Decimal → number
export const LibraryEntrySchema = z.object({
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
  hoursPlayed: z.preprocess((v) => (v != null ? Number(v) : null), z.number().nullable()),
  notes: z.string().nullable(),
  completedAt: z.date().nullable(),
  hltbMain: z.number().nullable(),
  hltbMainExtra: z.number().nullable(),
  hltbCompletionist: z.number().nullable(),
  hltbStatus: z.enum(['FOUND', 'MISS', 'FAILED']).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type LibraryEntry = z.infer<typeof LibraryEntrySchema>;

export const LibraryListQuery = z.object({});
