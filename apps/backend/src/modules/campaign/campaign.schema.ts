import { completionGoalSchema, LibraryStatusEnum } from '@detonado/shared';
import { z } from 'zod';

export { type CreateCampaignInput, createCampaignSchema } from '@detonado/shared';

const hours = z.preprocess((v) => (v == null ? null : Number(v)), z.number().nullable());
export const campaignResponseSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  startedAt: z.date(),
  archivedAt: z.date().nullable(),
  isActive: z.boolean(),
  status: LibraryStatusEnum,
  baseHours: hours,
  hoursPlayed: hours,
  rating: z.number().nullable(),
  notes: z.string().nullable(),
  completedAt: z.date().nullable(),
  completionGoal: completionGoalSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
