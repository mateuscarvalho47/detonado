import { z } from 'zod';

export {
  type OrganizationNameInput,
  organizationNameSchema,
  type UpdateOrganizationInput,
  updateOrganizationSchema,
} from '@detonado/shared';
export type OrganizationKind = 'collections' | 'tags';
export const organizationResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
