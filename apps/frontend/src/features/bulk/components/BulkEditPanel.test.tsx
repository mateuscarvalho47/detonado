import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { removeLibraryEntry } from "@/features/detail/service/detailService";
import type { LibraryEntry } from "@/types/api";
import { updateLibraryBulk } from "../service/bulkService";
import { BulkEditPanel } from "./BulkEditPanel";

vi.mock("@/features/detail/service/detailService", () => ({
	removeLibraryEntry: vi.fn(),
}));
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

it("lists selected games and only deletes after explicit confirmation", async () => {
	const qc = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	});
	qc.setQueryData(["me"], { id: "owner" });
	vi.mocked(removeLibraryEntry).mockResolvedValue(undefined);
	const noop = vi.fn();
	const selected = [
		{
			id: "remove-me",
			igdbId: 42,
			name: "Jogo para excluir",
			platforms: ["PC"],
		},
	] as LibraryEntry[];
	const selection = {
		active: true,
		selected,
		selectedIds: new Set(["remove-me"]),
		locked: false,
		setLocked: noop,
		begin: noop,
		clear: noop,
		cancel: noop,
		selectAll: noop,
		toggle: noop,
	};
	render(
		<QueryClientProvider client={qc}>
			<BulkEditPanel selection={selection} visibleCount={1} />
		</QueryClientProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
	expect(screen.getByRole("dialog")).toHaveTextContent("Jogo para excluir");
	expect(screen.getByRole("dialog")).toHaveTextContent("permanentemente");
	expect(removeLibraryEntry).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Cancelar exclusão" }));
	expect(removeLibraryEntry).not.toHaveBeenCalled();
	fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
	fireEvent.click(screen.getByRole("button", { name: "Confirmar exclusão" }));
	await waitFor(() =>
		expect(screen.getByText("Jogo para excluir: Excluído")).toBeInTheDocument(),
	);
	expect(removeLibraryEntry).toHaveBeenCalledWith("remove-me");
});
