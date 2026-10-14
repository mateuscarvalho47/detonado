import { z } from "zod";
export const campaignSchema = z.object({
	startedAt: z
		.string()
		.refine(
			(value) => value === "" || Number.isFinite(new Date(value).getTime()),
			"Data inválida.",
		),
	notes: z.string().max(4000),
	confirmed: z
		.boolean()
		.refine((value) => value, "Confirme o início da nova campanha."),
});
export type CampaignValues = z.infer<typeof campaignSchema>;
