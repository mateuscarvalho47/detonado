import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { updateLibraryBulk } from "../service/bulkService";
import { BulkEditPanel } from "./BulkEditPanel";

vi.mock("../service/bulkService", () => ({ updateLibraryBulk: vi.fn() }));
vi.mock("@/features/library/service/libraryService", () => ({
	fetchLibrary: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/organization/hooks/useOrganization", () => ({
	useOrganization: () => ({ data: { tags: [] }, isSuccess: true }),
}));
it("shows each partial result with the corresponding game name and requires a preview confirmation", async () => {
	const selected = [
		{ id: "a", name: "Jogo A", platforms: ["PC"] },
		{ id: "b", name: "Jogo B", platforms: ["PS5"] },
	] as LibraryEntry[];
	const noop = vi.fn();
	const selection = {
		active: true,
		selected,
		selectedIds: new Set(["a", "b"]),
		locked: false,
		setLocked: noop,
		begin: noop,
		clear: noop,
		cancel: noop,
		selectAll: noop,
		toggle: noop,
	};
	vi.mocked(updateLibraryBulk).mockResolvedValue({
		results: [
			{ id: "a", state: "UPDATED" },
			{ id: "b", state: "FAILED", error: "Plataforma incompatível" },
		],
		summary: { updated: 1, failed: 1 },
	});
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={qc}>
			<BulkEditPanel selection={selection} visibleCount={2} />
		</QueryClientProvider>,
	);
	fireEvent.click(screen.getByRole("checkbox", { name: "Alterar status" }));
	fireEvent.click(screen.getByRole("button", { name: "Revisar alterações" }));
	await waitFor(() =>
		expect(
			screen.getByRole("heading", {
				name: "Confirmar alterações em 2 jogo(s)",
			}),
		).toBeInTheDocument(),
	);
	expect(updateLibraryBulk).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Confirmar e aplicar" }));
	await waitFor(() =>
		expect(screen.getByText("Jogo A: Atualizado")).toBeInTheDocument(),
	);
	expect(
		screen.getByText("Jogo B: Falhou — Plataforma incompatível"),
	).toBeInTheDocument();
});
