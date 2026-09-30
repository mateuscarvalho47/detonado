import { useMemo } from "react";
import { compareQueue } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import type { LibraryEntry } from "@/types/api";

export function useLibraryFilters(library: LibraryEntry[]) {
	const statusFilter = useAppStore((s) => s.libraryStatusFilter);
	const setStatusFilter = useAppStore((s) => s.setLibraryStatusFilter);
	const search = useAppStore((s) => s.librarySearch);
	const setSearch = useAppStore((s) => s.setLibrarySearch);
	const sort = useAppStore((s) => s.librarySortField);
	const setSort = useAppStore((s) => s.setLibrarySortField);
	const view = useAppStore((s) => s.libraryView);
	const setView = useAppStore((s) => s.setLibraryView);

	const filtered = useMemo(() => {
		let result = [...library];

		if (statusFilter) {
			result = result.filter((g) => g.status === statusFilter);
		}

		if (search.trim()) {
			const q = search.toLowerCase();
			result = result.filter((g) => {
				const notes = g.notes?.toLowerCase() ?? "";
				return g.name.toLowerCase().includes(q) || notes.includes(q);
			});
		}

		result.sort((a, b) => {
			switch (sort) {
				case "name":
					return a.name.localeCompare(b.name);
				case "rating":
					return (b.rating ?? -1) - (a.rating ?? -1);
				case "hoursPlayed":
					return (b.hoursPlayed ?? -1) - (a.hoursPlayed ?? -1);
				case "queue":
					return compareQueue(a, b);
				default:
					return b.createdAt.localeCompare(a.createdAt);
			}
		});

		return result;
	}, [library, statusFilter, search, sort]);

	return {
		statusFilter,
		setStatusFilter,
		search,
		setSearch,
		sort,
		setSort,
		view,
		setView,
		filtered,
	};
}
