import { z } from "zod";
export const organizationNameSchema = z.strictObject({
	name: z.string().trim().min(1).max(100),
});
const ids = z
	.array(z.string().min(1).max(100))
	.max(100)
	.refine(
		(items) => new Set(items).size === items.length,
		"Identificador repetido",
	);
export const updateOrganizationSchema = z.strictObject({
	collectionIds: ids,
	tagIds: ids,
});
export type OrganizationNameInput = z.infer<typeof organizationNameSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
