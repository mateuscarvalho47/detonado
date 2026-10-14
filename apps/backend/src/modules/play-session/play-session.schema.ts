import { z } from 'zod';

export {
  type CreatePlaySessionInput,
  createPlaySessionSchema,
  type UpdatePlaySessionInput,
  updatePlaySessionSchema,
} from '@detonado/shared';
export const playSessionResponseSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  campaignId: z.string(),
  clientId: z.string(),
  playedAt: z.date(),
  durationMinutes: z.number(),
  notes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
