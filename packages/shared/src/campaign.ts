import { z } from "zod";
import { NOTES_MAX } from "./library.js";
export const createCampaignSchema = z.strictObject({
	startedAt: z.iso.datetime({ offset: true }).optional(),
	notes: z.string().trim().max(NOTES_MAX).nullable().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
