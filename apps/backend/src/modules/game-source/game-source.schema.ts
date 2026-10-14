import { sourceKindSchema } from '@detonado/shared';
import { z } from 'zod';

export {
  type CreateGameSourceInput,
  createGameSourceSchema,
  type UpdateGameSourceInput,
  updateGameSourceSchema,
} from '@detonado/shared';
export const gameSourceResponseSchema = z.object({
  id: z.string(),
  kind: sourceKindSchema,
  label: z.string(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
