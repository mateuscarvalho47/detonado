import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLibrary } from "@/features/library/service/libraryService";
import type { LibraryEntry } from "@/types/api";
import { updateLibraryBulk } from "../service/bulkService";
import { useBulkEdit } from "./useBulkEdit";

vi.mock("../service/bulkService", () => ({ updateLibraryBulk: vi.fn() }));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn(),
}));
vi.mock("@/features/organization/hooks/useOrganization", () => ({
	useOrganization: () => ({
		data: { tags: [{ id: "tag", name: "Favoritos" }] },
		isSuccess: true,
	}),
}));
const selected = [
	{ id: "a", igdbId: 1, name: "Jogo A", platforms: ["PC"] },
	{ id: "b", igdbId: 2, name: "Jogo B", platforms: ["PS5"] },
] as LibraryEntry[];
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchLibrary).mockResolvedValue(selected);
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return {
		...renderHook(({ games }) => useBulkEdit(games), {
			wrapper,
			initialProps: { games: selected },
		}),
		qc,
	};
}
describe("bulk edit confirmation", () => {
	it("sends only enabled fields after confirmation and retains names for partial results", async () => {
		const { result } = setup();
		act(() => {
			result.current.form.setValue("applyStatus", true);
			result.current.form.setValue("status", "PLAYING");
			result.current.form.setValue("applyPlatform", true);
			result.current.form.setValue("userPlatform", "PC");
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		expect(updateLibraryBulk).not.toHaveBeenCalled();
		expect(result.current.previewCurrent).toBe(true);
		vi.mocked(updateLibraryBulk).mockResolvedValue({
			results: [
				{ id: "a", state: "UPDATED" },
				{ id: "b", state: "FAILED", error: "Plataforma incompatível" },
			],
			summary: { updated: 1, failed: 1 },
		});
		act(() => result.current.apply());
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(updateLibraryBulk).toHaveBeenCalledWith({
			ids: ["a", "b"],
			changes: { status: "PLAYING", userPlatform: "PC" },
		});
		expect(result.current.mutation.variables?.names).toEqual({
			a: "Jogo A",
			b: "Jogo B",
		});
		expect(result.current.mutation.data?.summary).toEqual({
			updated: 1,
			failed: 1,
		});
	});
	it("invalidates a confirmation when fields or selected games change", async () => {
		const { result, rerender } = setup();
		act(() => result.current.form.setValue("applyTags", true));
		await act(async () => {
			await result.current.onSubmit();
		});
		expect(result.current.preview?.payload.changes).toEqual({ tagIds: [] });
		act(() => result.current.form.setValue("tagIds", ["tag"]));
		expect(result.current.previewCurrent).toBe(false);
		act(() => result.current.apply());
		expect(updateLibraryBulk).not.toHaveBeenCalled();
		await act(async () => {
			await result.current.onSubmit();
		});
		rerender({ games: selected.slice(0, 1) });
		expect(result.current.previewCurrent).toBe(false);
		act(() => result.current.apply());
		expect(updateLibraryBulk).not.toHaveBeenCalled();
	});
	it("supports explicit platform clearing without altering tags or collections", async () => {
		const { result } = setup();
		act(() => result.current.form.setValue("applyPlatform", true));
		await act(async () => {
			await result.current.onSubmit();
		});
		expect(result.current.preview?.payload.changes).toEqual({
			userPlatform: null,
		});
	});
});
