import { useNavigate, useSearch } from "@tanstack/react-router";
import { type SetStateAction, useMemo } from "react";
import { useExpiryClock } from "@/shared/hooks/useExpiryClock";
import { compareQueue } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import type { LibraryEntry } from "@/types/api";
import { matchesFilters } from "../lib/matchesFilters";
import type { LibrarySearch } from "../schema/librarySearch";
import type { LibraryFilterValues } from "../schema/savedFilterSchema";

export function useLibraryFilters(library: LibraryEntry[]) {
	const location = useSearch({ from: "/library/" });
	const navigate = useNavigate({ from: "/library/" });
	const storedSort = useAppStore((s) => s.librarySortField);
	const storeSort = useAppStore((s) => s.setLibrarySortField);
	const storedView = useAppStore((s) => s.libraryView);
	const storeView = useAppStore((s) => s.setLibraryView);
	const { sort: urlSort, view: urlView, search = "" } = location;
	const advanced = useMemo(() => {
		const { sort: _sort, view: _view, search: _search, ...values } = location;
		return values;
	}, [location]);
	const sort = urlSort ?? storedSort;
	const view = urlView ?? storedView;
	const statusFilter =
		advanced.statuses?.length === 1 ? advanced.statuses[0] : null;
	function update(next: LibrarySearch, replace = false) {
		void navigate({
			to: "/library",
			search: { ...next, sort: next.sort ?? sort, view: next.view ?? view },
			replace,
		});
	}
	function setAdvanced(action: SetStateAction<LibraryFilterValues>) {
		const next = typeof action === "function" ? action(advanced) : action;
		update({ ...next, search, sort, view });
	}
	function setSearch(value: string) {
		update({ ...location, search: value || undefined }, true);
	}
	function setSort(value: typeof sort) {
		storeSort(value);
		update({ ...location, sort: value });
	}
	function setView(value: typeof view) {
		storeView(value);
		update({ ...location, view: value });
	}
	const expirations = useMemo(
		() =>
			library.flatMap((entry) =>
				(entry.sources ?? [])
					.filter(
						(source) =>
							!advanced.sourceKind || source.kind === advanced.sourceKind,
					)
					.map((source) => source.expiresAt),
			),
		[library, advanced.sourceKind],
	);
	const now = useExpiryClock(expirations, !!advanced.availability);
	const activeStatuses =
		advanced.statuses ?? (statusFilter ? [statusFilter] : []);
	const criteria: LibraryFilterValues = {
		...advanced,
		statuses: activeStatuses,
		search,
	};
	function setStatusFilter(status: typeof statusFilter) {
		update({ ...location, statuses: status ? [status] : undefined });
	}
	function restore(next: LibraryFilterValues) {
		update({ ...next, sort, view });
	}
	const filtered = useMemo(() => {
		const result = library.filter((entry) =>
			matchesFilters(
				entry,
				{
					...advanced,
					statuses: advanced.statuses ?? (statusFilter ? [statusFilter] : []),
					search,
				},
				now,
			),
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
	}, [library, statusFilter, search, sort, advanced, now]);

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
