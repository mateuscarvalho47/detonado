import { z } from "zod";

// Game
export const SEARCH_QUERY_MAX = 100;

export const searchQuerySchema = z.object({
	q: z.string().min(2).max(SEARCH_QUERY_MAX),
});

export const hltbInfoSchema = z
	.object({
		mainHours: z.number().nonnegative().nullable(),
		mainExtraHours: z.number().nonnegative().nullable(),
		completionistHours: z.number().nonnegative().nullable(),
	})
	.nullable();

export type HltbInfo = z.infer<typeof hltbInfoSchema>;

export const gameSearchResultSchema = z.object({
	igdbId: z.number(),
	name: z.string(),
	coverUrl: z.string().optional(),
	releaseYear: z.number().optional(),
	platforms: z.array(z.string()),
	genres: z.array(z.string()),
});

export const hltbStatusSchema = z.enum(["FOUND", "MISS", "FAILED"]);

export type HltbStatus = z.infer<typeof hltbStatusSchema>;

export const gameDetailSchema = gameSearchResultSchema.extend({
	summary: z.string().optional(),
	hltb: hltbInfoSchema.optional(),
	hltbStatus: hltbStatusSchema.optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type GameSearchResult = z.infer<typeof gameSearchResultSchema>;
export type GameDetail = z.infer<typeof gameDetailSchema>;
