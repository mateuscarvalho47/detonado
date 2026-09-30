import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fetchLibraryEntry,
	refreshLibraryHltb,
	removeLibraryEntry,
	updateLibraryEntry,
} from "./detailService";

vi.mock("@/lib/api", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/api")>();
	return {
		...actual,
		api: {
			get: vi.fn(),
			post: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
		},
	};
});

import { api } from "@/lib/api";

afterEach(() => vi.clearAllMocks());

const ENTRY = {
	id: "entry-1",
	igdbId: 42,
	name: "Elden Ring",
	genres: ["RPG"],
	platforms: ["PC"],
	status: "PLAYING" as const,
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

describe("fetchLibraryEntry", () => {
	it("returns the matching entry by igdbId", async () => {
		vi.mocked(api.get).mockResolvedValue([ENTRY]);
		const result = await fetchLibraryEntry(42);
		expect(result).toEqual(ENTRY);
		expect(api.get).toHaveBeenCalledWith("/library");
	});

	it("throws when entry is not found in the library", async () => {
		vi.mocked(api.get).mockResolvedValue([ENTRY]);
		await expect(fetchLibraryEntry(999)).rejects.toThrow(
			"Jogo não encontrado na biblioteca",
		);
	});
});

describe("updateLibraryEntry", () => {
	it("calls api.patch with entry id and data", async () => {
		const updated = { ...ENTRY, status: "COMPLETED" as const };
		vi.mocked(api.patch).mockResolvedValue(updated);
		const data = { status: "COMPLETED" as const };
		const result = await updateLibraryEntry("entry-1", data);
		expect(result).toEqual(updated);
		expect(api.patch).toHaveBeenCalledWith("/library/entry-1", data);
	});
});

describe("refreshLibraryHltb", () => {
	it("posts to the entry hltb route", async () => {
		vi.mocked(api.post).mockResolvedValue(ENTRY);
		const result = await refreshLibraryHltb("entry-1");
		expect(result).toEqual(ENTRY);
		expect(api.post).toHaveBeenCalledWith("/library/entry-1/hltb");
	});
});

describe("removeLibraryEntry", () => {
	it("calls api.delete with entry id", async () => {
		vi.mocked(api.delete).mockResolvedValue(undefined);
		await removeLibraryEntry("entry-1");
		expect(api.delete).toHaveBeenCalledWith("/library/entry-1");
	});
});
