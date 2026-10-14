import { z } from "zod";
import { updateLibraryEntryInput } from "./library.js";

const fields = updateLibraryEntryInput.shape;
function optionalCell<T extends z.ZodType>(schema: T) {
	return z.preprocess(
		(value) =>
			typeof value === "string" && value.trim() === "" ? undefined : value,
		schema.optional(),
	);
}
const igdbId = z.preprocess(
	(value) =>
		typeof value === "string" && /^\d+$/.test(value.trim())
			? Number(value.trim())
			: value,
	z.number().int().positive(),
);
export const libraryImportRowSchema = z
	.strictObject({
		igdbId: optionalCell(igdbId),
		name: optionalCell(z.string().trim().min(2).max(200)),
		status: optionalCell(fields.status),
		userPlatform: optionalCell(fields.userPlatform),
		hoursPlayed: optionalCell(fields.hoursPlayed),
		rating: optionalCell(fields.rating),
		notes: optionalCell(fields.notes),
		completionGoal: optionalCell(fields.completionGoal),
		completedAt: optionalCell(fields.completedAt),
		duplicateAction: z.preprocess(
			(value) => (value === undefined || value === "" ? "SKIP" : value),
			z.enum(["SKIP", "UPDATE"]),
		),
	})
	.refine((row) => row.igdbId !== undefined || row.name !== undefined, {
		message: "Informe igdbId ou nome do jogo",
	});
export const previewLibraryImportSchema = z.strictObject({
	rows: z.array(z.unknown()).min(1).max(100),
});
export const commitLibraryImportSchema = z.strictObject({
	rows: z.array(z.unknown()).min(1).max(10),
});
export type LibraryImportRow = z.infer<typeof libraryImportRowSchema>;
