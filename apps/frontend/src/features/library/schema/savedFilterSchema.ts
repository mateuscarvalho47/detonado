import { z } from "zod";
export const libraryFilterSchema = z.object({
	statuses: z
		.array(
			z.enum([
				"WISHLIST",
				"BACKLOG",
				"PLAYING",
				"PAUSED",
				"COMPLETED",
				"DROPPED",
			]),
		)
		.optional(),
	platform: z.string().max(200).optional(),
	genre: z.string().max(200).optional(),
	maxHours: z.number().positive().max(99999.9).optional(),
	includeUnknownDuration: z.boolean().optional(),
	search: z.string().max(100).optional(),
});
export type LibraryFilterValues = z.infer<typeof libraryFilterSchema>;
export const savedFilterSchema = z.object({
	name: z.string().trim().min(1, "Informe um nome.").max(100),
	filters: libraryFilterSchema,
});
export type SavedFilterValues = z.infer<typeof savedFilterSchema>;
