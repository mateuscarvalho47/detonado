import { z } from "zod";
import { NOTES_MAX } from "./library.js";

const journalFields = z.strictObject({
	text: z.string().trim().min(1).max(NOTES_MAX),
	occurredAt: z.iso.datetime({ offset: true }),
	spoiler: z.boolean(),
});
export const createJournalEntrySchema = journalFields.extend({
	spoiler: z.boolean().optional(),
	campaignId: z.string().min(1).max(100).nullable().optional(),
});
export const updateJournalEntrySchema = journalFields
	.partial()
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
