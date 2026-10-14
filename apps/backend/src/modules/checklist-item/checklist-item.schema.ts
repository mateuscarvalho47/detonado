import { z } from 'zod';

export {
  type CreateChecklistItemInput,
  createChecklistItemSchema,
  type UpdateChecklistItemInput,
  updateChecklistItemSchema,
} from '@detonado/shared';
export const checklistItemResponseSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
