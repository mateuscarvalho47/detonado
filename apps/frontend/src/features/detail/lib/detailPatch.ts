import type { GameStatus } from "@/types/api";
import type { DetailFormValues } from "../schema/detailSchema";

const WITH_PROGRESS = new Set<GameStatus>([
	"PLAYING",
	"PAUSED",
	"COMPLETED",
	"DROPPED",
]);

export interface DetailPatch {
	status: GameStatus;
	userPlatform: string | null;
	rating?: number;
	hoursPlayed?: number;
	notes: string;
	completedAt: string | null;
}

export function detailPatch(values: DetailFormValues): DetailPatch {
	const withProgress = WITH_PROGRESS.has(values.status);
	const platform = values.userPlatform.trim();
	return {
		status: values.status,
		userPlatform: platform ? platform : null,
		rating: withProgress ? Math.round(values.rating) : undefined,
		hoursPlayed: withProgress ? values.hoursPlayed : undefined,
		notes: values.notes,
		completedAt:
			values.status === "COMPLETED" ? values.completedAt || null : null,
	};
}
