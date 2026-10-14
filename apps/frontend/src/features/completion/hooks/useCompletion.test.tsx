import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateLibraryEntry } from "@/features/detail/service/detailService";
import type { LibraryEntry } from "@/types/api";
import {
	createChecklistItem,
	deleteChecklistItem,
	fetchChecklist,
	updateChecklistItem,
} from "../service/checklistService";
import { useChecklist, useCompletionGoal } from "./useCompletion";

vi.mock("../service/checklistService", () => ({
	createChecklistItem: vi.fn(),
	deleteChecklistItem: vi.fn(),
	fetchChecklist: vi.fn(),
	updateChecklistItem: vi.fn(),
}));
vi.mock("@/features/detail/service/detailService", () => ({
	updateLibraryEntry: vi.fn(),
}));
const item = {
	id: "item",
	text: "Tarefa",
	completed: false,
	createdAt: "",
	updatedAt: "",
};
const game: LibraryEntry = {
	id: "game",
	igdbId: 1,
	name: "Game",
	status: "PLAYING",
	hoursPlayed: 10,
	genres: [],
	platforms: [],
	hltbMain: 10,
	hltbMainExtra: 20,
	hltbCompletionist: 30,
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchChecklist).mockResolvedValue({ items: [item] });
});
function setup() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={qc}>{children}</QueryClientProvider>
	);
	return { qc, wrapper };
}
describe("completion goals and checklist", () => {
	it("saves only selected goal, preserving game hours and status", async () => {
		const { wrapper, qc } = setup();
		qc.setQueryData(["library"], [game]);
		const { result } = renderHook(() => useCompletionGoal(game), { wrapper });
		expect(result.current.form.getValues("completionGoal")).toBe("MAIN");
		vi.mocked(updateLibraryEntry).mockResolvedValue({
			...game,
			completionGoal: "EXTRAS",
		});
		act(() =>
			result.current.form.setValue("completionGoal", "EXTRAS", {
				shouldDirty: true,
			}),
		);
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(updateLibraryEntry).toHaveBeenCalledWith("game", {
			completionGoal: "EXTRAS",
		});
		expect(qc.getQueryData(["library", 1])).toMatchObject({
			completionGoal: "EXTRAS",
			hoursPlayed: 10,
			status: "PLAYING",
		});
	});
	it("creates, renames, toggles and deletes tasks without changing game status", async () => {
		const { wrapper } = setup();
		const { result } = renderHook(() => useChecklist("game"), { wrapper });
		vi.mocked(createChecklistItem).mockResolvedValue(item);
		act(() => result.current.form.setValue("text", " Nova tarefa "));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));
		expect(createChecklistItem).toHaveBeenCalledWith("game", "Nova tarefa");
		act(() => result.current.edit(item));
		act(() => result.current.form.setValue("text", "Renomeada"));
		vi.mocked(updateChecklistItem).mockResolvedValue(item);
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.editing).toBeNull());
		expect(updateChecklistItem).toHaveBeenCalledWith("game", "item", {
			text: "Renomeada",
		});
		act(() => result.current.toggle(item, true));
		await waitFor(() =>
			expect(updateChecklistItem).toHaveBeenCalledWith("game", "item", {
				completed: true,
			}),
		);
		act(() => result.current.remove("item"));
		await waitFor(() =>
			expect(deleteChecklistItem).toHaveBeenCalledWith("game", "item"),
		);
		expect(updateLibraryEntry).not.toHaveBeenCalled();
	});
	it("preserves task edits when request fails", async () => {
		const { wrapper } = setup();
		const { result } = renderHook(() => useChecklist("game"), { wrapper });
		vi.mocked(createChecklistItem).mockRejectedValue(new Error("Falha"));
		act(() => result.current.form.setValue("text", "Preservar"));
		await act(async () => {
			await result.current.onSubmit();
		});
		await waitFor(() => expect(result.current.mutation.isError).toBe(true));
		expect(result.current.form.getValues("text")).toBe("Preservar");
	});
});
