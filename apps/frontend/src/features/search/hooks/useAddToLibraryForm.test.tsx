import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAddToLibraryForm } from "./useAddToLibraryForm";

const state = vi.hoisted(() => ({
	user: undefined as undefined | { preferredPlatform: string | null },
	mutateAsync: vi.fn(),
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
	useMe: () => ({ data: state.user }),
}));
vi.mock("@/features/library/hooks/useLibrary", () => ({
	useAddToLibrary: () => ({ mutateAsync: state.mutateAsync, isPending: false }),
}));
const game = { igdbId: 1, name: "Game", platforms: ["PC", "PS5"], genres: [] };
beforeEach(() => {
	state.user = undefined;
	state.mutateAsync.mockReset();
});
describe("preferred platform on add", () => {
	it("selects compatible preference and leaves incompatible preference empty", () => {
		state.user = { preferredPlatform: "PS5" };
		const { result, rerender } = renderHook(() =>
			useAddToLibraryForm(game, vi.fn()),
		);
		expect(result.current.form.getValues("userPlatform")).toBe("PS5");
		state.user = { preferredPlatform: "Switch" };
		rerender();
		expect(result.current.form.getValues("userPlatform")).toBe("");
	});
	it("applies a late preference without replacing a manual selection", async () => {
		const { result, rerender } = renderHook(() =>
			useAddToLibraryForm(game, vi.fn()),
		);
		expect(result.current.form.getValues("userPlatform")).toBe("PC");
		state.user = { preferredPlatform: "PS5" };
		rerender();
		await waitFor(() =>
			expect(result.current.form.getValues("userPlatform")).toBe("PS5"),
		);
		act(() => result.current.selectPlatform("PC"));
		state.user = { preferredPlatform: "Switch" };
		rerender();
		expect(result.current.form.getValues("userPlatform")).toBe("PC");
	});
	it("resets selection when switching games", () => {
		state.user = { preferredPlatform: "PS5" };
		const { result, rerender } = renderHook(
			({ current }) => useAddToLibraryForm(current, vi.fn()),
			{ initialProps: { current: game } },
		);
		act(() => result.current.selectPlatform("PC"));
		rerender({ current: { ...game, igdbId: 2, platforms: ["PS5"] } });
		expect(result.current.form.getValues("userPlatform")).toBe("PS5");
	});
	it("keeps first-platform behavior with no preference", () => {
		state.user = { preferredPlatform: null };
		const { result } = renderHook(() => useAddToLibraryForm(game, vi.fn()));
		expect(result.current.form.getValues("userPlatform")).toBe("PC");
	});
});
