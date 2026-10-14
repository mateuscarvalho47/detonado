import { z } from "zod";
export const sessionSchema = z.object({
	playedAt: z
		.string()
		.min(1, "Informe a data.")
		.refine(
			(value) => Number.isFinite(new Date(value).getTime()),
			"Data inválida.",
		),
	durationMinutes: z.number().int("Use minutos inteiros.").min(1).max(1440),
	notes: z.string().max(4000),
});
export type SessionValues = z.infer<typeof sessionSchema>;
