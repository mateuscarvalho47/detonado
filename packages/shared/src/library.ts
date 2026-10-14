import { z } from "zod";

// Library
export const LibraryStatusEnum = z.enum([
	"WISHLIST",
	"BACKLOG",
	"PLAYING",
	"PAUSED",
	"COMPLETED",
	"DROPPED",
]);

export const completionGoalSchema = z.enum(["MAIN", "EXTRAS", "COMPLETIONIST"]);
export type CompletionGoal = z.infer<typeof completionGoalSchema>;

export type LibraryStatus = z.infer<typeof LibraryStatusEnum>;

// Hours and a rating belong to these statuses. Queue rows may still store both;
// library stats ignore them.
export const PROGRESS_STATUSES = [
	"PLAYING",
	"PAUSED",
	"COMPLETED",
	"DROPPED",
] as const;

// Decimal(6, 1) on LibraryEntry.hoursPlayed.
export const HOURS_MAX = 99999.9;
export const NOTES_MAX = 4000;

const calendarDateField = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
	.refine((value) => {
		const [year, month, day] = value.split("-").map(Number);
		if (!year || !month || !day) return false;
		const date = new Date(Date.UTC(year, month - 1, day));
		return (
			date.getUTCFullYear() === year &&
			date.getUTCMonth() === month - 1 &&
			date.getUTCDate() === day
		);
	}, "Data inválida");

function numericInput(value: unknown): unknown {
	if (typeof value !== "string" || value.trim() === "") return value;
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : value;
}

function roundHours(value: unknown): unknown {
	const numeric = numericInput(value);
	return typeof numeric === "number" ? Math.round(numeric * 10) / 10 : numeric;
}

function roundRating(value: unknown): unknown {
	const numeric = numericInput(value);
	return typeof numeric === "number" ? Math.round(numeric) : numeric;
}

export const createLibraryEntryInput = z.object({
	completionGoal: completionGoalSchema.optional(),
	igdbId: z.number().int().positive(),
	status: LibraryStatusEnum,
	userPlatform: z.string().trim().max(100).optional(),
});

export const updateLibraryEntryInput = z
	.object({
		completionGoal: completionGoalSchema,
		status: LibraryStatusEnum,
		userPlatform: z.string().trim().max(100).nullable(),
		rating: z.preprocess(
			roundRating,
			z.number().int().min(0).max(10).nullable(),
		),
		hoursPlayed: z.preprocess(
			roundHours,
			z.number().min(0).max(HOURS_MAX).nullable(),
		),
		notes: z.string().max(NOTES_MAX).nullable(),
		completedAt: calendarDateField.nullable(),
	})
	.partial()
	.refine((data) => Object.keys(data).length > 0, {
		message: "Informe pelo menos um campo para atualizar",
	});

export type CreateLibraryEntryInput = z.infer<typeof createLibraryEntryInput>;
export type UpdateLibraryEntryInput = z.infer<typeof updateLibraryEntryInput>;

export const libraryStatsSchema = z.object({
	completedCampaigns: z.number(),
	totalGames: z.number(),
	totalHours: z.number(),
	countByStatus: z.record(LibraryStatusEnum, z.number()),
	topGenres: z.array(z.object({ genre: z.string(), count: z.number() })),
	topPlatforms: z.array(z.object({ platform: z.string(), count: z.number() })),
	ratingDistribution: z.array(
		z.object({ rating: z.number(), count: z.number() }),
	),
	completedTimeline: z.array(
		z.object({ month: z.string(), count: z.number() }),
	),
});

export type LibraryStats = z.infer<typeof libraryStatsSchema>;
