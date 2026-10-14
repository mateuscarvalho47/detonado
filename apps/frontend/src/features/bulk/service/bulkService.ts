import { api } from "@/lib/api";
import type { GameStatus } from "@/types/api";
export interface BulkChanges {
	status?: GameStatus;
	userPlatform?: string | null;
	tagIds?: string[];
}
export interface BulkPayload {
	ids: string[];
	changes: BulkChanges;
}
export interface BulkResponse {
	results: { id: string; state: "UPDATED" | "FAILED"; error?: string }[];
	summary: { updated: number; failed: number };
}
export function updateLibraryBulk(payload: BulkPayload) {
	return api.post<BulkResponse>("/library/bulk", payload);
}
