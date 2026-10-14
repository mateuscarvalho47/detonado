import { z } from "zod";
export const suggestionSchema = z.object({
	platform: z.string().max(200),
	genre: z.string().max(200),
	maxHours: z.union([
		z.literal(""),
		z.number().positive("Informe uma duração maior que zero.").max(99999.9),
	]),
});
export type SuggestionValues = z.infer<typeof suggestionSchema>;
