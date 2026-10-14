import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { SuggestionsPanel } from "./SuggestionsPanel";

vi.mock("@/features/auth/hooks/useAuth", () => ({
	useMe: () => ({ data: { preferredPlatform: "PC" } }),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => (
		<span>{children}</span>
	),
}));
const game: LibraryEntry = {
	id: "1",
	igdbId: 1,
	name: "Jogo longo",
	status: "BACKLOG",
	genres: [],
	platforms: ["PC"],
	userPlatform: "PC",
	hltbMain: 30,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
};
describe("suggestions panel", () => {
	it("applies duration filters, explains unknown exclusions, and restores results on clear", async () => {
		render(
			<SuggestionsPanel
				library={[
					game,
					{
						...game,
						id: "2",
						igdbId: 2,
						name: "Sem estimativa",
						hltbMain: null,
					},
				]}
			/>,
		);
		expect(screen.getByText("Jogo longo")).toBeInTheDocument();
		fireEvent.change(screen.getByLabelText("Duração total: até (horas)"), {
			target: { value: "5" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Encontrar jogos" }));
		await waitFor(() =>
			expect(screen.getByText(/Nenhum jogo atende/)).toBeInTheDocument(),
		);
		expect(
			screen.getByText(/1 jogo\(s\) sem estimativa ficaram de fora/),
		).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Limpar" }));
		expect(screen.getByText("Jogo longo")).toBeInTheDocument();
		expect(screen.queryByText(/ficaram de fora/)).not.toBeInTheDocument();
	});
});
