import { z } from "zod";
import { gameSearchResultSchema } from "./game.js";
export const steamPreviewSchema = z.strictObject({
	offset: z.number().int().min(0).max(100000).default(0),
	limit: z.number().int().min(1).max(100).default(50),
});
export const steamVerifySchema = z.strictObject({
	parameters: z
		.record(
			z.string().regex(/^(steamState|openid\.[a-zA-Z0-9_.-]+)$/),
			z.string().max(4000),
		)
		.refine(
			(value) => Object.keys(value).length <= 40,
			"Resposta Steam inválida",
		),
	callbackUrl: z.url().max(16000),
});
export const steamStatusSchema = z.object({
	configured: z.boolean(),
	steamId: z.string().nullable(),
});
export const steamPreviewResponseSchema = z.object({
	steamId: z.string(),
	total: z.number(),
	offset: z.number(),
	limit: z.number(),
	hasMore: z.boolean(),
	rows: z.array(
		z.object({
			appId: z.number(),
			name: z.string(),
			hoursPlayed: z.number(),
			match: gameSearchResultSchema.nullable(),
			duplicate: z.boolean(),
			userPlatform: z.string().nullable(),
		}),
	),
});
export type SteamPreviewInput = z.infer<typeof steamPreviewSchema>;
