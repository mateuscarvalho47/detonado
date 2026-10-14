import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { fetchSteamStatus } from "../service/steamService";
import { SteamImportPanel } from "./SteamImportPanel";

vi.mock("../service/steamService", () => ({
	fetchSteamStatus: vi.fn(),
	fetchSteamPreview: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<span>{children}</span>
	),
}));
it("explains unavailable integration without asking for credentials or blocking other imports", async () => {
	vi.mocked(fetchSteamStatus).mockResolvedValue({
		configured: false,
		steamId: null,
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={qc}>
			<SteamImportPanel />
		</QueryClientProvider>,
	);
	expect(
		await screen.findByText(
			/Você pode continuar usando a busca e a importação CSV/,
		),
	).toBeInTheDocument();
	expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: "Preparar prévia Steam" }),
	).not.toBeInTheDocument();
});
