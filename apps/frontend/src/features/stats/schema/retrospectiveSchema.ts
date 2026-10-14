import { z } from "zod";
export const retrospectiveSchema = z.object({
	year: z.number().int().min(1970).max(2100),
	month: z.union([z.literal(""), z.number().int().min(1).max(12)]),
});
export type RetrospectiveValues = z.infer<typeof retrospectiveSchema>;
