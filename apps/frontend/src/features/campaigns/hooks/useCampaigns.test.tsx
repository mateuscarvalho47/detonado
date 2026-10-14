import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import {
	type Campaign,
	fetchCampaigns,
	startCampaign,
} from "../service/campaignService";
import { useCampaigns } from "./useCampaigns";

vi.mock("../service/campaignService", () => ({
	fetchCampaigns: vi.fn(),
	startCampaign: vi.fn(),
}));
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "COMPLETED",
	hoursPlayed: 50,
	baseHours: 40,
	rating: 8,
	notes: "Registro anterior",
	activeCampaignId: "old",
	genres: [],
	platforms: [],
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
	completedAt: "2026-10-13T15:00:00.000Z",
};
const campaign: Campaign = {
	id: "new",
	entryId: "game",
	startedAt: "2026-10-14T15:00:00.000Z",
	archivedAt: null,
	isActive: true,
	status: "PLAYING",
	baseHours: 0,
	hoursPlayed: 0,
	rating: null,
	notes: "Nova campanha",
	completedAt: null,
	completionGoal: "EXTRAS",
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchCampaigns).mockResolvedValue({ campaigns: [] });
});
function setup(disabled = false) {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	qc.setQueryData(["library"], [game]);
	qc.setQueryData(["library", 1], game);
	qc.setQueryData(["checklist", "game"], {
		items: [{ id: "old", completed: true }],
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useCampaigns(game, disabled), { wrapper }), qc };
}
describe("campaign transitions", () => {
	it("requires explicit confirmation and blocks when old record is still saving", async () => {
		const { result } = setup(true);
		void result.current.form.formState.errors;
		await act(async () => {
			await result.current.onSubmit();
		});
		expect(startCampaign).not.toHaveBeenCalled();
		act(() => result.current.form.setValue("confirmed", true));
		await act(async () => {
			await result.current.onSubmit();
		});
		expect(startCampaign).not.toHaveBeenCalled();
		expect(result.current.form.formState.errors.root?.message).toContain(
			"Aguarde",
		);
	});
	it("replaces current campaign cache and clears checklist after successful confirmed start", async () => {
		const { result, qc } = setup();
		vi.mocked(startCampaign).mockResolvedValue(campaign);
		act(() => {
			result.current.form.setValue("confirmed", true);
			result.current.form.setValue("notes", " Nova campanha ");
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(startCampaign).toHaveBeenCalledWith("game", {
			notes: "Nova campanha",
		});
		expect(qc.getQueryData(["library", 1])).toMatchObject({
			activeCampaignId: "new",
			status: "PLAYING",
			hoursPlayed: 0,
			baseHours: 0,
			completionGoal: "EXTRAS",
			notes: "Nova campanha",
			completedAt: undefined,
			rating: undefined,
		});
		expect(qc.getQueryData(["checklist", "game"])).toEqual({ items: [] });
		expect(qc.getQueryData(["library"])).toEqual([
			expect.objectContaining({ activeCampaignId: "new" }),
		]);
	});
	it("keeps current campaign and entered notes if starting fails", async () => {
		const { result, qc } = setup();
		vi.mocked(startCampaign).mockRejectedValue(new Error("Falha"));
		act(() => {
			result.current.form.setValue("confirmed", true);
			result.current.form.setValue("notes", "Preservar");
		});
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		expect(result.current.form.getValues("notes")).toBe("Preservar");
		expect(qc.getQueryData(["library", 1])).toEqual(game);
	});
});
