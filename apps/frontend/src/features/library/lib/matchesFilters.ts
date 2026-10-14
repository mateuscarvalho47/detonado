import type { LibraryEntry } from "@/types/api";
import type { LibraryFilterValues } from "../schema/savedFilterSchema";
export function matchesFilters(
	entry: LibraryEntry,
	filters: LibraryFilterValues,
	now = Date.now(),
) {
	const sources = (entry.sources ?? []).filter(
		(source) => !filters.sourceKind || source.kind === filters.sourceKind,
	);
	if (filters.sourceKind && sources.length === 0) return false;
	if (filters.availability) {
		const available = sources.some(
			(source) =>
				source.expiresAt === null || new Date(source.expiresAt).getTime() > now,
		);
		const actual =
			sources.length === 0 ? "UNKNOWN" : available ? "AVAILABLE" : "EXPIRED";
		if (filters.availability !== actual) return false;
	}

	if (filters.statuses?.length && !filters.statuses.includes(entry.status))
		return false;
	if (
		filters.collectionId &&
		!entry.collectionIds?.includes(filters.collectionId)
	)
		return false;
	if (filters.tagId && !entry.tagIds?.includes(filters.tagId)) return false;
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
