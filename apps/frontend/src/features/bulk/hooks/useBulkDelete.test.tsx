import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { removeLibraryEntry } from "@/features/detail/service/detailService";
import { fetchLibrary } from "@/features/library/service/libraryService";
import { ApiError } from "@/lib/api";
import { rememberResponse } from "@/lib/offlineStore";
import type { LibraryEntry } from "@/types/api";
import { useBulkDelete } from "./useBulkDelete";

vi.mock("@/features/detail/service/detailService", () => ({
	removeLibraryEntry: vi.fn(),
}));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn(),
}));
vi.mock("@/lib/offlineStore", () => ({
	rememberResponse: vi.fn().mockResolvedValue(undefined),
}));
const games = [
	{ id: "a", igdbId: 1, name: "Jogo A" },
	{ id: "b", igdbId: 2, name: "Jogo B" },
	{ id: "c", igdbId: 3, name: "Jogo C" },
] as LibraryEntry[];
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(removeLibraryEntry).mockReset().mockResolvedValue(undefined);
	vi.mocked(fetchLibrary).mockReset().mockResolvedValue(games);
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["me"], { id: "owner" });
	qc.setQueryData(["library"], games);
	qc.setQueryData(["library", 1], games[0]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return {
		...renderHook(({ selected }) => useBulkDelete(selected), {
			wrapper,
			initialProps: { selected: games },
		}),
		qc,
	};
}
it("requires a current reviewed selection and invalidates it when selected games change", () => {
	const { result, rerender } = setup();
	act(() => result.current.apply());
	expect(removeLibraryEntry).not.toHaveBeenCalled();
	act(() => result.current.review());
	expect(result.current.previewCurrent).toBe(true);
	rerender({ selected: games.slice(1) });
	expect(result.current.previewCurrent).toBe(false);
	act(() => result.current.apply());
	expect(removeLibraryEntry).not.toHaveBeenCalled();
	act(() => result.current.cancel());
	expect(result.current.preview).toBeNull();
});
it("keeps per-game failures and removes confirmed deletions from list, detail and offline cache even if refresh fails", async () => {
	vi.mocked(removeLibraryEntry).mockImplementation(async (id) => {
		if (id === "b")
			throw new ApiError("FAILED", "Falha no servidor", undefined, 500);
	});
	vi.mocked(fetchLibrary).mockRejectedValue(new Error("Sem conexão"));
	const { result, qc } = setup();
	act(() => result.current.review());
	act(() => result.current.apply());
	await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
	expect(removeLibraryEntry.mock.calls.map(([id]) => id)).toEqual([
		"a",
		"b",
		"c",
	]);
	expect(result.current.mutation.data).toMatchObject([
		{ name: "Jogo A", removed: true },
		{ name: "Jogo B", removed: false, error: "Falha no servidor" },
		{ name: "Jogo C", removed: true },
	]);
	expect(qc.getQueryData(["library"])).toEqual([games[1]]);
	expect(qc.getQueryData(["library", 1])).toBeUndefined();
	expect(rememberResponse).toHaveBeenCalledWith(
		"/library",
		[games[1]],
		"owner",
	);
	expect(result.current.cacheError).toBeTruthy();
});
it("does not resurrect deletions from a stale offline refresh", async () => {
	const { result, qc } = setup();
	act(() => result.current.review());
	act(() => result.current.apply());
	await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
	expect(qc.getQueryData(["library"])).toEqual([]);
	expect(rememberResponse).toHaveBeenCalledWith("/library", [], "owner");
});
it("stops after account changes and leaves the next account's cache intact", async () => {
	let complete!: () => void;
	vi.mocked(removeLibraryEntry).mockImplementationOnce(
		() =>
			new Promise<void>((resolve) => {
				complete = resolve;
			}),
	);
	const { result, qc } = setup();
	act(() => result.current.review());
	act(() => result.current.apply());
	await waitFor(() => expect(removeLibraryEntry).toHaveBeenCalledTimes(1));
	act(() => {
		qc.setQueryData(["me"], { id: "other" });
		qc.setQueryData(["library"], [{ id: "other-game" }]);
		complete();
	});
	await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
	expect(removeLibraryEntry).toHaveBeenCalledTimes(1);
	expect(qc.getQueryData(["library"])).toEqual([{ id: "other-game" }]);
	expect(fetchLibrary).not.toHaveBeenCalled();
	expect(rememberResponse).not.toHaveBeenCalled();
});
it("stops on rate limits and reports unprocessed games without automatic retry", async () => {
	vi.mocked(removeLibraryEntry).mockRejectedValue(
		new ApiError("RATE_LIMIT", "Aguarde", undefined, 429),
	);
	const { result } = setup();
	act(() => result.current.review());
	act(() => result.current.apply());
	await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
	expect(removeLibraryEntry).toHaveBeenCalledTimes(1);
	expect(result.current.mutation.data).toHaveLength(3);
	expect(result.current.mutation.data?.every((game) => !game.removed)).toBe(
		true,
	);
});
