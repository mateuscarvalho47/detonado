import { z } from "zod";
import { NOTES_MAX } from "./library.js";

const sessionFields = z.strictObject({
	playedAt: z.iso.datetime({ offset: true }),
	durationMinutes: z.number().int().min(1).max(1440),
	notes: z.string().trim().max(NOTES_MAX).nullable().optional(),
});
export const createPlaySessionSchema = sessionFields.extend({
	clientId: z.uuid(),
});
export const updatePlaySessionSchema = sessionFields
	.partial()
	.refine((input) => Object.keys(input).length > 0, {
		message: "Informe pelo menos um campo",
	});
export type CreatePlaySessionInput = z.infer<typeof createPlaySessionSchema>;
export type UpdatePlaySessionInput = z.infer<typeof updatePlaySessionSchema>;
