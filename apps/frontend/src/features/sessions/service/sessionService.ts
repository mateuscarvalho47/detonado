import { api } from "@/lib/api";
export interface PlaySession {
	id: string;
	entryId: string;
	clientId: string;
	campaignId?: string;
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
export function fetchSessions(entryId: string, campaignId?: string) {
	return api.get<{ sessions: PlaySession[] }>(
		`/library/${entryId}/sessions${campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ""}`,
	);
}
export function createSession(
	entryId: string,
	payload: SessionPayload & { clientId: string; campaignId?: string | null },
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
