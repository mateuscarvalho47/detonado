import { api } from "@/lib/api";
import type { GameStatus, LibraryEntry } from "@/types/api";

export interface LibraryEntryPatch {
	status?: GameStatus;
	userPlatform?: string | null;
	rating?: number | null;
	hoursPlayed?: number | null;
	notes?: string | null;
	completedAt?: string | null;
}

export function fetchLibraryEntry(igdbId: number) {
	return api.get<LibraryEntry[]>("/library").then((list) => {
		const entry = list.find((e) => e.igdbId === igdbId);
		if (!entry) throw new Error("Jogo não encontrado na biblioteca");
		return entry;
	});
}

export function updateLibraryEntry(id: string, data: LibraryEntryPatch) {
	return api.patch<LibraryEntry>(`/library/${id}`, data);
}

export function refreshLibraryHltb(id: string) {
	return api.post<LibraryEntry>(`/library/${id}/hltb`);
}

export function removeLibraryEntry(id: string) {
	return api.delete(`/library/${id}`);
}
