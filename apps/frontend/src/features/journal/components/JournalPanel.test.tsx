import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { fetchCampaigns } from "@/features/campaigns/service/campaignService";
import type { LibraryEntry } from "@/types/api";
import { fetchJournal } from "../service/journalService";
import { JournalPanel } from "./JournalPanel";

vi.mock("../service/journalService", () => ({
	createJournalEntry: vi.fn(),
	deleteJournalEntry: vi.fn(),
	fetchJournal: vi.fn(),
	updateJournalEntry: vi.fn(),
}));
vi.mock("@/features/campaigns/service/campaignService", () => ({
	fetchCampaigns: vi.fn(),
}));
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchCampaigns).mockResolvedValue({ campaigns: [] });
});
it("hides spoiler text until requested and labels preserved notes without asserting their original date", async () => {
	vi.mocked(fetchJournal).mockResolvedValue({
		entries: [
			{
				id: "one",
				campaignId: "old",
				text: "Segredo do chefe final",
				occurredAt: "2026-10-14T13:00:00.000Z",
				spoiler: true,
				legacy: true,
				createdAt: "",
				updatedAt: "",
			},
		],
	});
	const game = {
		id: "game",
		igdbId: 1,
		activeCampaignId: "active",
	} as LibraryEntry;
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={qc}>
			<JournalPanel game={game} />
		</QueryClientProvider>,
	);
	await waitFor(() =>
		expect(
			screen.getByText("Anotação anterior preservada"),
		).toBeInTheDocument(),
	);
	expect(screen.getByText(/Data original desconhecida/)).toBeInTheDocument();
	expect(screen.queryByText("Segredo do chefe final")).not.toBeInTheDocument();
	fireEvent.click(
		screen.getByRole("button", { name: "Mostrar anotação com spoiler" }),
	);
	expect(screen.getByText("Segredo do chefe final")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", { name: "Ocultar spoiler" }));
	expect(screen.queryByText("Segredo do chefe final")).not.toBeInTheDocument();
	fireEvent.change(screen.getByLabelText("Mostrar registros de"), {
		target: { value: "active" },
	});
	await waitFor(() =>
		expect(fetchJournal).toHaveBeenCalledWith("game", "active"),
	);
});
