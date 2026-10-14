import { api } from "@/lib/api";
export interface JournalEntry {
	id: string;
	campaignId: string;
	text: string;
	occurredAt: string;
	spoiler: boolean;
	legacy: boolean;
	createdAt: string;
	updatedAt: string;
}
export interface JournalPayload {
	text: string;
	occurredAt: string;
	spoiler: boolean;
}
export function fetchJournal(entryId: string, campaignId?: string) {
	return api.get<{ entries: JournalEntry[] }>(
		`/library/${entryId}/journal${campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : ""}`,
	);
}
export function createJournalEntry(
	entryId: string,
	payload: JournalPayload & { campaignId?: string | null },
) {
	return api.post<JournalEntry>(`/library/${entryId}/journal`, payload);
}
export function updateJournalEntry(
	entryId: string,
	id: string,
	payload: JournalPayload,
) {
	return api.patch<JournalEntry>(`/library/${entryId}/journal/${id}`, payload);
}
export function deleteJournalEntry(entryId: string, id: string) {
	return api.delete(`/library/${entryId}/journal/${id}`);
}
