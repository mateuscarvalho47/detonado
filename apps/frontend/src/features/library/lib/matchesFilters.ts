import type { LibraryEntry } from "@/types/api";
import type { LibraryFilterValues } from "../schema/savedFilterSchema";
export function matchesFilters(
	entry: LibraryEntry,
	filters: LibraryFilterValues,
) {
	if (filters.statuses?.length && !filters.statuses.includes(entry.status))
		return false;
	if (filters.platform && entry.userPlatform !== filters.platform) return false;
	if (filters.genre && !entry.genres.includes(filters.genre)) return false;
	if (filters.maxHours !== undefined) {
		if (entry.hltbMain == null) {
			if (!filters.includeUnknownDuration) return false;
		} else if (entry.hltbMain > filters.maxHours) return false;
	}
	const search = filters.search?.trim().toLocaleLowerCase("pt-BR");
	return (
		!search ||
		entry.name.toLocaleLowerCase("pt-BR").includes(search) ||
		!!entry.notes?.toLocaleLowerCase("pt-BR").includes(search)
	);
}
