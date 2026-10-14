import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { fetchSessions } from "../service/sessionService";
import { SessionsPanel } from "./SessionsPanel";

vi.mock("../service/sessionService", () => ({
	fetchSessions: vi.fn(),
	createSession: vi.fn(),
	updateSession: vi.fn(),
	deleteSession: vi.fn(),
}));
it("keeps pending minutes out of server totals, disables server editing and distinguishes missing history", async () => {
	vi.mocked(fetchSessions).mockResolvedValue({
		offlineHistoryMissing: true,
		sessions: [
			{
				id: "offline:uuid",
				entryId: "game",
				clientId: "uuid",
				playedAt: "2026-10-14T12:00:00.000Z",
				durationMinutes: 45,
				notes: "Pending",
				createdAt: "",
				updatedAt: "",
				pending: true,
			},
		],
	});
	const game = {
		id: "game",
		igdbId: 1,
		hoursPlayed: 2,
		baseHours: 2,
	} as LibraryEntry;
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<SessionsPanel game={game} />
		</QueryClientProvider>,
	);
	expect(
		await screen.findByText(/aguardando sincronização\. As horas pendentes/),
	).toBeInTheDocument();
	expect(screen.getByText(/0h em sessões/)).toBeInTheDocument();
	expect(
		screen.getByText(/O histórico do servidor ainda não foi salvo/),
	).toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /Editar sessão de/ }),
	).not.toBeInTheDocument();
	expect(
		screen.queryByRole("button", { name: /Excluir sessão de/ }),
	).not.toBeInTheDocument();
});
