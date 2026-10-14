import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	commitImport,
	previewImport,
} from "@/features/import/service/importService";
import { fetchLibrary } from "@/features/library/service/libraryService";
import { fetchSteamPreview, fetchSteamStatus } from "../service/steamService";
import { useSteamImport } from "./useSteamImport";

vi.mock("../service/steamService", () => ({
	fetchSteamStatus: vi.fn(),
	fetchSteamPreview: vi.fn(),
}));
vi.mock("@/features/import/service/importService", () => ({
	commitImport: vi.fn(),
	previewImport: vi.fn(),
}));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn(),
}));
const match = {
	igdbId: 1,
	name: "Game",
	platforms: ["PC (Microsoft Windows)"],
	genres: [],
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchSteamStatus).mockResolvedValue({
		configured: true,
		steamId: "76561198000000000",
	});
	vi.mocked(fetchLibrary).mockResolvedValue([]);
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useSteamImport(), { wrapper }), qc };
}
describe("Steam import preview", () => {
	it("imports only new resolved games with cumulative hours and immutable SKIP behavior", async () => {
		vi.mocked(fetchSteamPreview).mockResolvedValue({
			steamId: "76561198000000000",
			total: 2,
			offset: 0,
			limit: 50,
			hasMore: false,
			rows: [
				{
					appId: 10,
					name: "Game",
					hoursPlayed: 10,
					match,
					duplicate: false,
					userPlatform: "PC (Microsoft Windows)",
				},
				{
					appId: 20,
					name: "Existing",
					hoursPlayed: 200,
					match: { ...match, igdbId: 2 },
					duplicate: true,
					userPlatform: "PC (Microsoft Windows)",
				},
			],
		});
		vi.mocked(previewImport).mockResolvedValue({
			rows: [
				{
					index: 0,
					state: "READY",
					input: { igdbId: 1, hoursPlayed: 10, duplicateAction: "SKIP" },
					error: null,
				},
				{
					index: 1,
					state: "DUPLICATE",
					input: { igdbId: 2, hoursPlayed: 200, duplicateAction: "SKIP" },
					error: null,
				},
			],
		});
		vi.mocked(commitImport).mockResolvedValue({
			results: [{ index: 0, state: "ADDED" }],
			summary: { added: 1, updated: 0, skipped: 0, failed: 0 },
		});
		const { result } = setup();
		await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
		act(() => result.current.load(0));
		await waitFor(() => expect(result.current.ready).toHaveLength(1));
		expect(commitImport).not.toHaveBeenCalled();
		act(() => result.current.start());
		await waitFor(() =>
			expect(result.current.batch.commit.isSuccess).toBe(true),
		);
		expect(commitImport).toHaveBeenCalledWith([
			{ igdbId: 1, hoursPlayed: 10, duplicateAction: "SKIP" },
		]);
	});
	it("does not request a preview when integration is unavailable", async () => {
		vi.mocked(fetchSteamStatus).mockResolvedValue({
			configured: false,
			steamId: null,
		});
		const { result } = setup();
		await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
		act(() => result.current.load(0));
		expect(fetchSteamPreview).not.toHaveBeenCalled();
	});
	it("resolves an unmatched game explicitly and preserves global indices on later pages", async () => {
		vi.mocked(fetchSteamPreview).mockResolvedValue({
			steamId: "76561198000000000",
			total: 51,
			offset: 50,
			limit: 50,
			hasMore: false,
			rows: [
				{
					appId: 10,
					name: "Game",
					hoursPlayed: 1.5,
					match: null,
					duplicate: false,
					userPlatform: null,
				},
			],
		});
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
			.mockResolvedValueOnce({
				rows: [
					{
						index: 0,
						state: "READY",
						input: { igdbId: 1, hoursPlayed: 1.5, duplicateAction: "SKIP" },
						error: null,
					},
				],
			});
		const { result } = setup();
		await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
		act(() => result.current.load(50));
		await waitFor(() => expect(result.current.preview.isSuccess).toBe(true));
		expect(result.current.ready).toHaveLength(0);
		act(() => result.current.resolve(10, match));
		await waitFor(() => expect(result.current.ready).toHaveLength(1));
		expect(result.current.ready[0]?.index).toBe(50);
		expect(vi.mocked(previewImport).mock.calls[1]?.[0]).toEqual([
			{
				igdbId: 1,
				name: "Game",
				hoursPlayed: 1.5,
				userPlatform: "PC (Microsoft Windows)",
				duplicateAction: "SKIP",
			},
		]);
	});
	it("clears old preview and blocks import after disconnect or account changes", async () => {
		vi.mocked(fetchSteamPreview).mockResolvedValue({
			steamId: "76561198000000000",
			total: 1,
			offset: 0,
			limit: 50,
			hasMore: false,
			rows: [
				{
					appId: 10,
					name: "Game",
					hoursPlayed: 10,
					match,
					duplicate: false,
					userPlatform: null,
				},
			],
		});
		vi.mocked(previewImport).mockResolvedValue({
			rows: [
				{
					index: 0,
					state: "READY",
					input: { igdbId: 1, duplicateAction: "SKIP" },
					error: null,
				},
			],
		});
		const { result, qc } = setup();
		await waitFor(() => expect(result.current.status.isSuccess).toBe(true));
		act(() => result.current.load(0));
		await waitFor(() => expect(result.current.ready).toHaveLength(1));
		act(() =>
			qc.setQueryData(["steam-status"], {
				configured: true,
				steamId: "76561198000000001",
			}),
		);
		await waitFor(() => expect(result.current.source).toBeNull());
		expect(result.current.ready).toHaveLength(0);
		act(() => result.current.start());
		expect(commitImport).not.toHaveBeenCalled();
		act(() =>
			qc.setQueryData(["steam-status"], { configured: true, steamId: null }),
		);
		act(() => result.current.start());
		expect(commitImport).not.toHaveBeenCalled();
	});
});
