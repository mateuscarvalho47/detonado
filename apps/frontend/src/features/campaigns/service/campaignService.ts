import { api } from "@/lib/api";
import type { GameStatus } from "@/types/api";
export interface Campaign {
	id: string;
	entryId: string;
	startedAt: string;
	archivedAt: string | null;
	isActive: boolean;
	status: GameStatus;
	baseHours: number | null;
	hoursPlayed: number | null;
	rating: number | null;
	notes: string | null;
	completedAt: string | null;
	completionGoal: "MAIN" | "EXTRAS" | "COMPLETIONIST";
	createdAt: string;
	updatedAt: string;
}
export function fetchCampaigns(entryId: string) {
	return api.get<{ campaigns: Campaign[] }>(`/library/${entryId}/campaigns`);
}
export function startCampaign(
	entryId: string,
	values: { startedAt?: string; notes: string | null },
) {
	return api.post<Campaign>(`/library/${entryId}/campaigns`, values);
}
