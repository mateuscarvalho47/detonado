import { z } from "zod";
import { libraryFilterSchema } from "./savedFilterSchema";
export const librarySearchSchema = libraryFilterSchema.extend({
	sort: z
		.enum(["createdAt", "name", "rating", "hoursPlayed", "queue"])
		.optional(),
	view: z.enum(["grid", "list"]).optional(),
});
export type LibrarySearch = z.infer<typeof librarySearchSchema>;
export function validateLibrarySearch(
	raw: Record<string, unknown>,
): LibrarySearch {
	const result: Record<string, unknown> = {};
	for (const [key, schema] of Object.entries(librarySearchSchema.shape)) {
		const parsed = schema.safeParse(raw[key]);
		if (parsed.success && parsed.data !== undefined) result[key] = parsed.data;
	}
	return result;
}
