import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { useBulkSelection } from "./useBulkSelection";

it("caps selection at 100, discards filtered-out games, and blocks edits while applying", () => {
	const visible = Array.from(
		{ length: 150 },
		(_, index) => ({ id: String(index) }) as LibraryEntry,
	);
	const { result, rerender } = renderHook(
		({ games }) => useBulkSelection(games),
		{ initialProps: { games: visible } },
	);
	act(() => result.current.begin());
	act(() => result.current.selectAll());
	expect(result.current.selected).toHaveLength(100);
	act(() => result.current.toggle("100"));
	expect(result.current.selected).toHaveLength(100);
	act(() => result.current.toggle("0"));
	act(() => result.current.toggle("100"));
	expect(result.current.selectedIds.has("100")).toBe(true);
	act(() => result.current.setLocked(true));
	act(() => result.current.clear());
	expect(result.current.selected).toHaveLength(100);
	act(() => result.current.setLocked(false));
	rerender({ games: visible.slice(0, 5) });
	expect(result.current.selected.map((game) => game.id)).toEqual([
		"1",
		"2",
		"3",
		"4",
	]);
	act(() => result.current.toggle("149"));
	expect(result.current.selected).toHaveLength(4);
	act(() => result.current.cancel());
	expect(result.current.selected).toHaveLength(0);
	expect(result.current.active).toBe(false);
});
