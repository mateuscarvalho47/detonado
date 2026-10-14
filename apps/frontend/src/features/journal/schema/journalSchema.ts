import { z } from "zod";
export const journalSchema = z.object({
	text: z.string().trim().min(1, "Escreva uma anotação.").max(4000),
	occurredAt: z
		.string()
		.min(1, "Informe a data.")
		.refine(
			(value) => Number.isFinite(new Date(value).getTime()),
			"Data inválida.",
		),
	spoiler: z.boolean(),
});
export type JournalValues = z.infer<typeof journalSchema>;
