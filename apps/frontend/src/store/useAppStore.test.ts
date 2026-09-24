import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "./useAppStore";

const INITIAL_STATE = {
	searchOpen: false,
	libraryView: "grid" as const,
	libraryStatusFilter: null,
	librarySortField: "createdAt" as const,
	librarySearch: "",
};

beforeEach(() => {
	useAppStore.setState(INITIAL_STATE);
});

describe("useAppStore — initial state", () => {
	it("has correct default values", () => {
		const state = useAppStore.getState();
		expect(state.searchOpen).toBe(false);
		expect(state.libraryView).toBe("grid");
		expect(state.libraryStatusFilter).toBeNull();
		expect(state.librarySortField).toBe("createdAt");
		expect(state.librarySearch).toBe("");
	});
});

describe("setSearchOpen", () => {
	it("opens and closes the search modal", () => {
		useAppStore.getState().setSearchOpen(true);
		expect(useAppStore.getState().searchOpen).toBe(true);
		useAppStore.getState().setSearchOpen(false);
		expect(useAppStore.getState().searchOpen).toBe(false);
	});
});

describe("setLibraryView", () => {
	it("switches between grid and list", () => {
		useAppStore.getState().setLibraryView("list");
		expect(useAppStore.getState().libraryView).toBe("list");
		useAppStore.getState().setLibraryView("grid");
		expect(useAppStore.getState().libraryView).toBe("grid");
	});
});

describe("setLibraryStatusFilter", () => {
	it("sets a status filter", () => {
		useAppStore.getState().setLibraryStatusFilter("PLAYING");
		expect(useAppStore.getState().libraryStatusFilter).toBe("PLAYING");
	});

	it("clears the filter with null", () => {
		useAppStore.getState().setLibraryStatusFilter("COMPLETED");
		useAppStore.getState().setLibraryStatusFilter(null);
		expect(useAppStore.getState().libraryStatusFilter).toBeNull();
	});
});

describe("setLibrarySortField", () => {
	it("updates the sort field", () => {
		useAppStore.getState().setLibrarySortField("name");
		expect(useAppStore.getState().librarySortField).toBe("name");
		useAppStore.getState().setLibrarySortField("rating");
		expect(useAppStore.getState().librarySortField).toBe("rating");
	});
});

describe("setLibrarySearch", () => {
	it("updates the search query", () => {
		useAppStore.getState().setLibrarySearch("elden");
		expect(useAppStore.getState().librarySearch).toBe("elden");
	});

	it("clears the search query", () => {
		useAppStore.getState().setLibrarySearch("zelda");
		useAppStore.getState().setLibrarySearch("");
		expect(useAppStore.getState().librarySearch).toBe("");
	});
});

describe("theme", () => {
	it("does not keep a theme toggle in state or the persisted slice", () => {
		const state = useAppStore.getState() as Record<string, unknown>;
		expect(state.theme).toBeUndefined();
		expect(state.setTheme).toBeUndefined();
		expect(state.toggleTheme).toBeUndefined();

		const partialize = useAppStore.persist.getOptions().partialize;
		expect(partialize).toBeTypeOf("function");
		if (!partialize) return;
		expect(partialize(useAppStore.getState())).not.toHaveProperty("theme");
	});
});
