import { z } from "zod";
export const retrospectiveQuerySchema = z.strictObject({
	year: z.coerce.number().int().min(1970).max(2100),
	month: z.coerce.number().int().min(1).max(12).optional(),
});
export const retrospectivePeriodSchema = z.object({
	year: z.number(),
	month: z.number().nullable(),
	startDate: z.string(),
	endDateExclusive: z.string(),
});
export const retrospectiveSummarySchema = z.object({
	sessions: z.number().nonnegative(),
	minutes: z.number().nonnegative(),
	playedGames: z.number().nonnegative(),
	completedCampaigns: z.number().nonnegative(),
});
export const retrospectivePointSchema = z.object({
	date: z.string(),
	sessions: z.number().nonnegative(),
	minutes: z.number().nonnegative(),
	completedCampaigns: z.number().nonnegative(),
});
export const retrospectiveResponseSchema = z.object({
	timeZone: z.literal("America/Sao_Paulo"),
	period: retrospectivePeriodSchema,
	current: retrospectiveSummarySchema,
	previous: z.object({
		period: retrospectivePeriodSchema,
		stats: retrospectiveSummarySchema,
	}),
	series: z.array(retrospectivePointSchema),
	untrackedHoursExcluded: z.literal(true),
});
export type RetrospectiveQuery = z.infer<typeof retrospectiveQuerySchema>;
export type RetrospectivePeriod = z.infer<typeof retrospectivePeriodSchema>;
export type RetrospectivePoint = z.infer<typeof retrospectivePointSchema>;

export type RetrospectiveResponse = z.infer<typeof retrospectiveResponseSchema>;
