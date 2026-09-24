import type { LibraryEntry } from "@/types/api";

export interface BacklogHours {
	total: number;
	missing: number;
	count: number;
}

export function backlogHours(entries: readonly LibraryEntry[]): BacklogHours {
	let total = 0;
	let missing = 0;
	let count = 0;

	for (const entry of entries) {
		if (entry.status !== "BACKLOG") continue;
		count += 1;
		// 0 is a real estimate; only null/undefined counts as missing.
		if (entry.hltbMain != null) {
			total += entry.hltbMain;
		} else {
			missing += 1;
		}
	}

	return { total, missing, count };
}

export function formatBacklogHours(hours: number): string {
	const rounded = Math.round(hours * 10) / 10;
	if (Number.isInteger(rounded)) return String(rounded);
	return rounded.toFixed(1);
}

export function backlogHoursLegend(summary: BacklogHours): string {
	if (summary.count === 0) return "A fila está vazia";
	if (summary.missing === 1) return "1 jogo da fila está sem estimativa";
	if (summary.missing > 1) {
		return `${summary.missing} jogos da fila estão sem estimativa`;
	}
	return "tempo principal da fila";
}
