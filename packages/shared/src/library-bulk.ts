import { z } from "zod";
import { LibraryStatusEnum } from "./library.js";

const ids = z
	.array(z.string().min(1).max(100))
	.max(100)
	.refine(
		(values) => new Set(values).size === values.length,
		"Identificador repetido",
	);
export const bulkLibraryChangesSchema = z
	.strictObject({
		status: LibraryStatusEnum.optional(),
		userPlatform: z.string().trim().min(1).max(100).nullable().optional(),
		tagIds: ids.optional(),
	})
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export const bulkLibraryInputSchema = z.strictObject({
	ids: ids.refine(
		(values) => values.length > 0,
		"Selecione pelo menos um jogo",
	),
	changes: bulkLibraryChangesSchema,
});
export const bulkLibraryResponseSchema = z.object({
	results: z.array(
		z.object({
			id: z.string(),
			state: z.enum(["UPDATED", "FAILED"]),
			error: z.string().optional(),
		}),
	),
	summary: z.object({ updated: z.number(), failed: z.number() }),
});
export type BulkLibraryInput = z.infer<typeof bulkLibraryInputSchema>;
export type BulkLibraryResponse = z.infer<typeof bulkLibraryResponseSchema>;
