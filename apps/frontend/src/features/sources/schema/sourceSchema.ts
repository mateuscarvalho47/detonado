import { z } from "zod";
export const sourceSchema = z.object({
	kind: z.enum(["STORE", "PHYSICAL", "SUBSCRIPTION", "LOAN"]),
	label: z.string().trim().min(1, "Informe o nome da origem.").max(200),
	expiresAt: z
		.string()
		.refine(
			(value) => value === "" || Number.isFinite(new Date(value).getTime()),
			"Data inválida.",
		),
});
export type SourceValues = z.infer<typeof sourceSchema>;
