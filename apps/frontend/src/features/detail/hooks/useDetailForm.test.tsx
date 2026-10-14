import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { useDetailForm } from "./useDetailForm";

const state = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("./useLibraryEntry", () => ({
	useUpdateLibraryEntry: () => ({
		mutateAsync: state.mutateAsync,
		isPending: false,
		error: null,
	}),
}));
vi.mock("@/shared/hooks/useDebounce", () => ({
	useDebounce: (value: unknown) => value,
}));
const game: LibraryEntry = {
	id: "a",
	igdbId: 1,
	name: "Game",
	genres: [],
	platforms: [],
	status: "PLAYING",
	hoursPlayed: 5,
	hltbMain: null,
	hltbMainExtra: null,
	hltbCompletionist: null,
	createdAt: "",
	updatedAt: "",
};
beforeEach(() => {
	state.mutateAsync.mockReset();
	state.mutateAsync.mockResolvedValue({});
});
describe("detail hours with sessions", () => {
	it("does not write stale total when sessions update the server", async () => {
		const { result, rerender } = renderHook(
			({ current }) => useDetailForm(current),
			{ initialProps: { current: game } },
		);
		result.current.form.register("hoursPlayed");
		rerender({ current: { ...game, hoursPlayed: 6 } });
		await waitFor(() =>
			expect(result.current.form.getValues("hoursPlayed")).toBe(6),
		);
		expect(state.mutateAsync).not.toHaveBeenCalled();
		act(() =>
			result.current.form.setValue("notes", "Nova nota", { shouldDirty: true }),
		);
		await waitFor(() => expect(state.mutateAsync).toHaveBeenCalled());
		expect(state.mutateAsync.mock.calls[0]?.[0]).not.toHaveProperty(
			"hoursPlayed",
		);
	});
	it("preserves manual total rejected by the server", async () => {
		state.mutateAsync.mockRejectedValue(new Error("Total abaixo das sessões"));
		const { result } = renderHook(() => useDetailForm(game));
		result.current.form.register("hoursPlayed");
		act(() =>
			result.current.form.setValue("hoursPlayed", 1, { shouldDirty: true }),
		);
		await waitFor(() =>
			expect(state.mutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({ hoursPlayed: 1 }),
			),
		);
		expect(result.current.form.getValues("hoursPlayed")).toBe(1);
	});
});
