import { api } from "@/lib/api";
import type { GameStatus } from "@/types/api";
export interface ImportRow {
	igdbId?: number;
	name?: string;
	status?: GameStatus;
	userPlatform?: string | null;
	hoursPlayed?: number | null;
	rating?: number | null;
	notes?: string | null;
	completionGoal?: "MAIN" | "EXTRAS" | "COMPLETIONIST";
	completedAt?: string | null;
	duplicateAction: "SKIP" | "UPDATE";
}
export interface ImportPreviewRow {
	index: number;
	input: ImportRow | null;
	state: "READY" | "DUPLICATE" | "NEEDS_MATCH" | "INVALID";
	error: string | null;
}
export interface ImportResult {
	index: number;
	igdbId?: number;
	entryId?: string;
	state: "ADDED" | "UPDATED" | "SKIPPED" | "FAILED";
	error?: string;
}
export interface ImportSummary {
	added: number;
	updated: number;
	skipped: number;
	failed: number;
}
export function previewImport(rows: unknown[]) {
	return api.post<{ rows: ImportPreviewRow[] }>("/library/import/preview", {
		rows,
	});
}
export function commitImport(rows: ImportRow[]) {
	return api.post<{ results: ImportResult[]; summary: ImportSummary }>(
		"/library/import",
		{ rows },
	);
}
