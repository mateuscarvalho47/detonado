import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibrarySortField, LibraryView } from "@/store/useAppStore";
import type { GameStatus } from "@/types/api";
import { useLibraryFilters } from "./useLibraryFilters";

type MockStoreState = {
	libraryStatusFilter: GameStatus | null;
	setLibraryStatusFilter: ReturnType<typeof vi.fn>;
	librarySearch: string;
	setLibrarySearch: ReturnType<typeof vi.fn>;
	librarySortField: LibrarySortField;
	setLibrarySortField: ReturnType<typeof vi.fn>;
	libraryView: LibraryView;
	setLibraryView: ReturnType<typeof vi.fn>;
};

const mockState = vi.hoisted(
	(): MockStoreState => ({
		libraryStatusFilter: null,
		setLibraryStatusFilter: vi.fn(),
		librarySearch: "",
		setLibrarySearch: vi.fn(),
		librarySortField: "createdAt",
		setLibrarySortField: vi.fn(),
		libraryView: "grid",
		setLibraryView: vi.fn(),
	}),
);

vi.mock("@/store/useAppStore", () => ({
	useAppStore: (selector: (s: MockStoreState) => unknown) =>
		selector(mockState),
}));

const makeEntry = (
	overrides: Partial<{
		id: string;
		igdbId: number;
		name: string;
		status: GameStatus;
		rating: number;
		hoursPlayed: number;
		createdAt: string;
		notes: string;
		queuePosition: number | null;
	}> = {},
) => ({
	id: "entry-1",
	igdbId: 1,
	name: "Game A",
	genres: [],
	platforms: [],
	status: "BACKLOG" as GameStatus,
	rating: undefined,
	hoursPlayed: undefined,
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
	...overrides,
});

const LIBRARY = [
	makeEntry({
		id: "1",
		igdbId: 1,
		name: "Zelda",
		status: "PLAYING",
		rating: 5,
		hoursPlayed: 30,
		createdAt: "2024-03-01T00:00:00Z",
	}),
	makeEntry({
		id: "2",
		igdbId: 2,
		name: "Elden Ring",
		status: "COMPLETED",
		rating: 4,
		hoursPlayed: 80,
		createdAt: "2024-01-01T00:00:00Z",
	}),
	makeEntry({
		id: "3",
		igdbId: 3,
		name: "Hollow Knight",
		status: "BACKLOG",
		createdAt: "2024-02-01T00:00:00Z",
	}),
];

beforeEach(() => {
	mockState.libraryStatusFilter = null;
	mockState.librarySearch = "";
	mockState.librarySortField = "createdAt";
	mockState.libraryView = "grid";
});

describe("useLibraryFilters — sorting", () => {
	it("sorts by createdAt descending by default", () => {
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered.map((e) => e.id)).toEqual(["1", "3", "2"]);
	});

	it("sorts by name alphabetically", () => {
		mockState.librarySortField = "name";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered.map((e) => e.name)).toEqual([
			"Elden Ring",
			"Hollow Knight",
			"Zelda",
		]);
	});

	it("sorts by rating descending", () => {
		mockState.librarySortField = "rating";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered[0].name).toBe("Zelda");
		expect(result.current.filtered[1].name).toBe("Elden Ring");
	});

	it("sorts the queue with the first position ahead of an unnumbered game", () => {
		mockState.librarySortField = "queue";
		const library = [
			makeEntry({
				id: "1",
				igdbId: 1,
				name: "Terceiro",
				queuePosition: 3,
				createdAt: "2024-01-01T00:00:00Z",
			}),
			makeEntry({
				id: "2",
				igdbId: 2,
				name: "Primeiro",
				queuePosition: 1,
				createdAt: "2024-03-01T00:00:00Z",
			}),
			makeEntry({
				id: "3",
				igdbId: 3,
				name: "Sem lugar",
				queuePosition: null,
				createdAt: "2020-01-01T00:00:00Z",
			}),
		];
		const { result } = renderHook(() => useLibraryFilters(library));
		expect(result.current.filtered.map((entry) => entry.name)).toEqual([
			"Primeiro",
			"Terceiro",
			"Sem lugar",
		]);
	});

	it("sorts by hoursPlayed descending", () => {
		mockState.librarySortField = "hoursPlayed";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered[0].name).toBe("Elden Ring");
		expect(result.current.filtered[1].name).toBe("Zelda");
	});
});

describe("useLibraryFilters — status filter", () => {
	it("returns only entries matching the status filter", () => {
		mockState.libraryStatusFilter = "PLAYING";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Zelda");
	});

	it("returns all entries when filter is null", () => {
		mockState.libraryStatusFilter = null;
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(3);
	});
});

describe("useLibraryFilters — search", () => {
	it("filters by name case-insensitively", () => {
		mockState.librarySearch = "elden";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Elden Ring");
	});

	it("ignores blank/whitespace search", () => {
		mockState.librarySearch = "   ";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(3);
	});

	it("finds a game by a word in the notes", () => {
		mockState.librarySearch = "castelo";
		const library = [
			makeEntry({
				id: "1",
				igdbId: 1,
				name: "Zelda",
				notes: "Parei no castelo",
			}),
			makeEntry({ id: "2", igdbId: 2, name: "Elden Ring" }),
		];
		const { result } = renderHook(() => useLibraryFilters(library));
		expect(result.current.filtered.map((entry) => entry.name)).toEqual([
			"Zelda",
		]);
	});
});

describe("useLibraryFilters — combined filter and search", () => {
	it("applies both status filter and search simultaneously", () => {
		mockState.libraryStatusFilter = "COMPLETED";
		mockState.librarySearch = "elden";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(1);
		expect(result.current.filtered[0].name).toBe("Elden Ring");
	});

	it("returns empty when no entries match combined filter", () => {
		mockState.libraryStatusFilter = "PLAYING";
		mockState.librarySearch = "elden";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.filtered).toHaveLength(0);
	});
});

describe("useLibraryFilters — returned setters", () => {
	it("exposes store setters and current state values", () => {
		mockState.libraryStatusFilter = "BACKLOG";
		mockState.librarySearch = "hollow";
		mockState.librarySortField = "name";
		mockState.libraryView = "list";
		const { result } = renderHook(() => useLibraryFilters(LIBRARY));
		expect(result.current.statusFilter).toBe("BACKLOG");
		expect(result.current.search).toBe("hollow");
		expect(result.current.sort).toBe("name");
		expect(result.current.view).toBe("list");
	});
});
