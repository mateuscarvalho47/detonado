import { api } from "@/lib/api";
import type { GameSource } from "@/types/api";
export interface SourcePayload {
	kind: GameSource["kind"];
	label: string;
	expiresAt: string | null;
}
export function fetchSources(entryId: string) {
	return api.get<{ sources: GameSource[] }>(`/library/${entryId}/sources`);
}
export function createSource(entryId: string, payload: SourcePayload) {
	return api.post<GameSource>(`/library/${entryId}/sources`, payload);
}
export function updateSource(
	entryId: string,
	id: string,
	payload: SourcePayload,
) {
	return api.patch<GameSource>(`/library/${entryId}/sources/${id}`, payload);
}
export function deleteSource(entryId: string, id: string) {
	return api.delete(`/library/${entryId}/sources/${id}`);
}
