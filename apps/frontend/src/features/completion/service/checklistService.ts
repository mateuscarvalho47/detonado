import { api } from "@/lib/api";
export interface ChecklistItem {
	id: string;
	text: string;
	completed: boolean;
	createdAt: string;
	updatedAt: string;
}
export function fetchChecklist(entryId: string) {
	return api.get<{ items: ChecklistItem[] }>(`/library/${entryId}/checklist`);
}
export function createChecklistItem(entryId: string, text: string) {
	return api.post<ChecklistItem>(`/library/${entryId}/checklist`, { text });
}
export function updateChecklistItem(
	entryId: string,
	id: string,
	values: { text?: string; completed?: boolean },
) {
	return api.patch<ChecklistItem>(
		`/library/${entryId}/checklist/${id}`,
		values,
	);
}
export function deleteChecklistItem(entryId: string, id: string) {
	return api.delete(`/library/${entryId}/checklist/${id}`);
}
