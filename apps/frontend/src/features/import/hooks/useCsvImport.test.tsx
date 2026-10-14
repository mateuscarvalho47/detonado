import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLibrary } from "@/features/library/service/libraryService";
import {
	commitImport,
	type ImportPreviewRow,
	previewImport,
} from "../service/importService";
import { useCsvImport } from "./useCsvImport";

vi.mock("../service/importService", () => ({
	previewImport: vi.fn(),
	commitImport: vi.fn(),
}));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn(),
}));
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchLibrary).mockResolvedValue([]);
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return renderHook(() => useCsvImport(), { wrapper });
}
function file(text: string) {
	const value = new File([text], "games.csv", { type: "text/csv" });
	Object.defineProperty(value, "text", { value: async () => text });
	return value;
}
function previewRows(count: number): ImportPreviewRow[] {
	return Array.from({ length: count }, (_, index) => ({
		index,
		state: "READY",
		input: { igdbId: index + 1, duplicateAction: "SKIP" },
		error: null,
	}));
}
describe("CSV import flow", () => {
	it("requires a new preview after explicit match and duplicate action choices", async () => {
		const { result } = setup();
		vi.mocked(previewImport)
			.mockResolvedValueOnce({
				rows: [
					{
						index: 0,
						state: "NEEDS_MATCH",
						input: { name: "Game", duplicateAction: "SKIP" },
						error: null,
					},
				],
			})
			.mockResolvedValue({
				rows: [
					{
						index: 0,
						state: "DUPLICATE",
						input: { igdbId: 1, name: "Game", duplicateAction: "SKIP" },
						error: null,
					},
				],
			});
		await act(async () => {
			await result.current.loadFile(file("name,hoursPlayed\nGame,1"));
		});
		expect(commitImport).not.toHaveBeenCalled();
		expect(result.current.ready).toEqual([]);
		await act(async () => {
			await result.current.changeRow(0, { igdbId: 1 });
		});
		expect(previewImport).toHaveBeenLastCalledWith(
			[{ name: "Game", hoursPlayed: "1", igdbId: 1 }],
			expect.anything(),
		);
		expect(result.current.ready[0]?.row.duplicateAction).toBe("SKIP");
		await act(async () => {
			await result.current.changeRow(0, { duplicateAction: "UPDATE" });
		});
		expect(previewImport).toHaveBeenLastCalledWith(
			[
				{
					name: "Game",
					hoursPlayed: "1",
					igdbId: 1,
					duplicateAction: "UPDATE",
				},
			],
			expect.anything(),
		);
	});
	it("commits in batches of ten, retains partial failures and does not resend after completion", async () => {
		const { result } = setup();
		vi.mocked(previewImport).mockResolvedValue({ rows: previewRows(12) });
		vi.mocked(commitImport)
			.mockResolvedValueOnce({
				results: Array.from({ length: 10 }, (_, index) => ({
					index,
					state: index === 1 ? "SKIPPED" : "ADDED",
				})),
				summary: { added: 9, skipped: 1, updated: 0, failed: 0 },
			})
			.mockRejectedValueOnce(new Error("Falha de rede"));
		await act(async () => {
			await result.current.loadFile(
				file(
					`igdbId\n${Array.from({ length: 12 }, (_, index) => index + 1).join("\n")}`,
				),
			);
		});
		act(() => result.current.start());
		await waitFor(() => expect(result.current.commit.isSuccess).toBe(true));
		expect(commitImport).toHaveBeenCalledTimes(2);
		expect(vi.mocked(commitImport).mock.calls[0]?.[0]).toHaveLength(10);
		expect(vi.mocked(commitImport).mock.calls[1]?.[0]).toHaveLength(2);
		expect(
			result.current.results
				.filter((item) => item.state === "FAILED")
				.map((item) => item.index),
		).toEqual([10, 11]);
		expect(result.current.progress).toEqual({ completed: 12, total: 12 });
		act(() => result.current.start());
		expect(commitImport).toHaveBeenCalledTimes(2);
	});
	it("rejects oversized files before reading or previewing", async () => {
		const { result } = setup();
		const oversized = new File(["x".repeat(1024 * 1024 + 1)], "large.csv");
		await act(async () => {
			await result.current.loadFile(oversized);
		});
		expect(result.current.error).toContain("1 MB");
		expect(previewImport).not.toHaveBeenCalled();
	});
});
