import { z } from "zod";
import { sourceKindSchema } from "./game-source.js";
import { HOURS_MAX, LibraryStatusEnum } from "./library.js";

export const libraryFiltersSchema = z.strictObject({
	sourceKind: sourceKindSchema.optional(),
	availability: z.enum(["AVAILABLE", "EXPIRED", "UNKNOWN"]).optional(),
	collectionId: z.string().min(1).max(100).optional(),
	tagId: z.string().min(1).max(100).optional(),
	statuses: z
		.array(LibraryStatusEnum)
		.max(6)
		.refine(
			(values) => new Set(values).size === values.length,
			"Status repetido",
		)
		.optional(),
	platform: z.string().trim().min(1).max(200).optional(),
	genre: z.string().trim().min(1).max(200).optional(),
	maxHours: z.number().positive().max(HOURS_MAX).optional(),
	includeUnknownDuration: z.boolean().optional(),
	search: z.string().trim().max(100).optional(),
});
export const createSavedFilterSchema = z.strictObject({
	name: z.string().trim().min(1).max(100),
	filters: libraryFiltersSchema,
});
export const updateSavedFilterSchema = createSavedFilterSchema
	.partial()
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export const savedFilterResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	filters: libraryFiltersSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type CreateSavedFilterInput = z.infer<typeof createSavedFilterSchema>;
export type UpdateSavedFilterInput = z.infer<typeof updateSavedFilterSchema>;
export type LibraryFilters = z.infer<typeof libraryFiltersSchema>;
