import { expect, it } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { completionEstimate } from "./completionEstimate";

it("uses the estimate corresponding to the goal, including unavailable values", () => {
	const game = {
		hltbMain: 10,
		hltbMainExtra: 20,
		hltbCompletionist: null,
	} as LibraryEntry;
	expect(completionEstimate(game, "MAIN")).toBe(10);
	expect(completionEstimate(game, "EXTRAS")).toBe(20);
	expect(completionEstimate(game, "COMPLETIONIST")).toBeNull();
});
