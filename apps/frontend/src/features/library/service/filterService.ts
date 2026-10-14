import { api } from "@/lib/api";
import type {
	LibraryFilterValues,
	SavedFilterValues,
} from "../schema/savedFilterSchema";
export interface SavedFilter {
	id: string;
	name: string;
	filters: LibraryFilterValues;
	createdAt: string;
	updatedAt: string;
}
export function fetchSavedFilters() {
	return api.get<{ filters: SavedFilter[] }>("/library/filters");
}
export function createSavedFilter(values: SavedFilterValues) {
	return api.post<SavedFilter>("/library/filters", values);
}
export function updateSavedFilter({
	id,
	...values
}: SavedFilterValues & { id: string }) {
	return api.patch<SavedFilter>(`/library/filters/${id}`, values);
}
export function deleteSavedFilter(id: string) {
	return api.delete(`/library/filters/${id}`);
}
