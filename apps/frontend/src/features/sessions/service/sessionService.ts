import { api } from "@/lib/api";
export interface PlaySession {
	id: string;
	entryId: string;
	clientId: string;
	playedAt: string;
	durationMinutes: number;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}
export interface SessionPayload {
	playedAt: string;
	durationMinutes: number;
	notes: string | null;
}
export function fetchSessions(entryId: string) {
	return api.get<{ sessions: PlaySession[] }>(`/library/${entryId}/sessions`);
}
export function createSession(
	entryId: string,
	payload: SessionPayload & { clientId: string },
) {
	return api.post<PlaySession>(`/library/${entryId}/sessions`, payload);
}
export function updateSession(
	entryId: string,
	id: string,
	payload: SessionPayload,
) {
	return api.patch<PlaySession>(`/library/${entryId}/sessions/${id}`, payload);
}
export function deleteSession(entryId: string, id: string) {
	return api.delete(`/library/${entryId}/sessions/${id}`);
}
