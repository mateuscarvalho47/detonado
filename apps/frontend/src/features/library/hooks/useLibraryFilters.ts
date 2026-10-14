import { useMemo, useState } from "react";
import { compareQueue } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import type { LibraryEntry } from "@/types/api";
import { matchesFilters } from "../lib/matchesFilters";
import type { LibraryFilterValues } from "../schema/savedFilterSchema";

export function useLibraryFilters(library: LibraryEntry[]) {
	const statusFilter = useAppStore((s) => s.libraryStatusFilter);
	const storeStatusFilter = useAppStore((s) => s.setLibraryStatusFilter);
	const search = useAppStore((s) => s.librarySearch);
	const setSearch = useAppStore((s) => s.setLibrarySearch);
	const sort = useAppStore((s) => s.librarySortField);
	const setSort = useAppStore((s) => s.setLibrarySortField);
	const view = useAppStore((s) => s.libraryView);
	const setView = useAppStore((s) => s.setLibraryView);

	const [advanced, setAdvanced] = useState<LibraryFilterValues>({});
	const activeStatuses =
		advanced.statuses ?? (statusFilter ? [statusFilter] : []);
	const criteria: LibraryFilterValues = {
		...advanced,
		statuses: activeStatuses,
		search,
	};
	function setStatusFilter(status: typeof statusFilter) {
		storeStatusFilter(status);
		setAdvanced((current) => ({ ...current, statuses: undefined }));
	}
	function restore(next: LibraryFilterValues) {
		setAdvanced(next);
		storeStatusFilter(null);
		setSearch(next.search ?? "");
	}
	const filtered = useMemo(() => {
		const result = library.filter((entry) =>
			matchesFilters(entry, {
				...advanced,
				statuses: advanced.statuses ?? (statusFilter ? [statusFilter] : []),
				search,
			}),
		);

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
	}, [library, statusFilter, search, sort, advanced]);

	return {
		advanced,
		setAdvanced,
		criteria,
		activeStatuses,
		restore,
		clear: () => restore({}),
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
