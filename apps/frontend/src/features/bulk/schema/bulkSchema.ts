import { z } from "zod";
export const bulkSchema = z
	.object({
		applyStatus: z.boolean(),
		status: z.enum([
			"WISHLIST",
			"BACKLOG",
			"PLAYING",
			"PAUSED",
			"COMPLETED",
			"DROPPED",
		]),
		applyPlatform: z.boolean(),
		userPlatform: z.string().trim().max(100),
		applyTags: z.boolean(),
		tagIds: z.array(z.string()).max(100),
	})
	.refine(
		(value) => value.applyStatus || value.applyPlatform || value.applyTags,
		{
			path: ["applyStatus"],
			message: "Escolha pelo menos um campo para alterar.",
		},
	);
export type BulkValues = z.infer<typeof bulkSchema>;
