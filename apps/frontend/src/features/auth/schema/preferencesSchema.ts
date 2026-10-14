import { z } from "zod";

export const preferencesSchema = z.object({
	preferredPlatform: z.string().trim().min(1).max(200).nullable(),
});
export type PreferencesValues = z.infer<typeof preferencesSchema>;
