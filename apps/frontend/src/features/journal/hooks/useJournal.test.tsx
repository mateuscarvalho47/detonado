import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCampaigns } from "@/features/campaigns/service/campaignService";
import type { LibraryEntry } from "@/types/api";
import {
	createJournalEntry,
	deleteJournalEntry,
	fetchJournal,
	type JournalEntry,
	updateJournalEntry,
} from "../service/journalService";
import { useJournal } from "./useJournal";

vi.mock("../service/journalService", () => ({
	createJournalEntry: vi.fn(),
	deleteJournalEntry: vi.fn(),
	fetchJournal: vi.fn(),
	updateJournalEntry: vi.fn(),
}));
vi.mock("@/features/campaigns/service/campaignService", () => ({
	fetchCampaigns: vi.fn(),
}));
const entry: JournalEntry = {
	id: "one",
	campaignId: "old",
	text: "Preservada",
	occurredAt: "2026-10-14T13:00:00.000Z",
	spoiler: false,
	legacy: true,
	createdAt: "",
	updatedAt: "",
};
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "PLAYING",
	activeCampaignId: "active",
	notes: "Onde parei original",
	genres: [],
	platforms: [],
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchCampaigns).mockResolvedValue({ campaigns: [] });
	vi.mocked(fetchJournal).mockResolvedValue({ entries: [entry] });
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["library", 1], game);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useJournal(game), { wrapper }), qc };
}
describe("progress journal", () => {
	it("creates in the expected active campaign without overwriting where I left off", async () => {
		const { result, qc } = setup();
		vi.mocked(createJournalEntry).mockResolvedValue({
			...entry,
			campaignId: "active",
			legacy: false,
		});
		act(() => {
			result.current.form.setValue("text", " Nova anotação ");
			result.current.form.setValue("spoiler", true);
			result.current.form.setValue("occurredAt", "2026-10-14T10:00");
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(createJournalEntry).toHaveBeenCalledWith("game", {
			text: "Nova anotação",
			occurredAt: new Date("2026-10-14T10:00").toISOString(),
			spoiler: true,
			campaignId: "active",
		});
		expect(qc.getQueryData(["library", 1])).toEqual(game);
	});
	it("edits and deletes a historical legacy entry while keeping metadata readonly", async () => {
		const { result } = setup();
		act(() => result.current.edit(entry));
		act(() => result.current.form.setValue("text", "Corrigida"));
		vi.mocked(updateJournalEntry).mockResolvedValue(entry);
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.editing).toBeNull());
		expect(updateJournalEntry).toHaveBeenCalledWith("game", "one", {
			text: "Corrigida",
			occurredAt: entry.occurredAt,
			spoiler: false,
		});
		act(() => result.current.setDeleting(entry));
		act(() => result.current.confirmDelete());
		await waitFor(() => expect(result.current.deleting).toBeNull());
		expect(deleteJournalEntry).toHaveBeenCalledWith("game", "one");
	});
	it("switches between all campaigns and one campaign and retains failed edits", async () => {
		const { result } = setup();
		await waitFor(() =>
			expect(fetchJournal).toHaveBeenCalledWith("game", undefined),
		);
		act(() => result.current.setCampaignFilter("old"));
		await waitFor(() =>
			expect(fetchJournal).toHaveBeenCalledWith("game", "old"),
		);
		vi.mocked(createJournalEntry).mockRejectedValue(new Error("Falha"));
		act(() => result.current.form.setValue("text", "Preservar edição"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		expect(result.current.form.getValues("text")).toBe("Preservar edição");
	});
});
