import { z } from "zod";
export const createChecklistItemSchema = z.strictObject({
	text: z.string().trim().min(1).max(500),
});
export const updateChecklistItemSchema = z
	.strictObject({
		text: z.string().trim().min(1).max(500).optional(),
		completed: z.boolean().optional(),
	})
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export type CreateChecklistItemInput = z.infer<
	typeof createChecklistItemSchema
>;
export type UpdateChecklistItemInput = z.infer<
	typeof updateChecklistItemSchema
>;
