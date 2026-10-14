import { z } from 'zod';

export {
  type CreateJournalEntryInput,
  createJournalEntrySchema,
  type UpdateJournalEntryInput,
  updateJournalEntrySchema,
} from '@detonado/shared';
export const journalEntryResponseSchema = z.object({
  id: z.string(),
  campaignId: z.string(),
  text: z.string(),
  occurredAt: z.date(),
  spoiler: z.boolean(),
  legacy: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
