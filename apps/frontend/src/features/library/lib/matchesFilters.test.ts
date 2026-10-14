import { describe, expect, it } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { matchesFilters } from "./matchesFilters";

const game: LibraryEntry = {
	id: "a",
	igdbId: 1,
	name: "Zelda",
	status: "BACKLOG",
	genres: ["Adventure"],
	platforms: ["PC", "PS5"],
	userPlatform: "PC",
	hltbMain: 10,
	hltbMainExtra: 20,
	hltbCompletionist: 30,
	createdAt: "",
	updatedAt: "",
	notes: "Castelo",
};
describe("combined library filters", () => {
	it("combines statuses, registered platform, genre, duration and notes search", () => {
		expect(
			matchesFilters(game, {
				statuses: ["BACKLOG", "PLAYING"],
				platform: "PC",
				genre: "Adventure",
				maxHours: 10,
				search: "CASTELO",
			}),
		).toBe(true);
		expect(matchesFilters(game, { platform: "PS5" })).toBe(false);
		expect(
			matchesFilters(game, { statuses: ["COMPLETED"], maxHours: 10 }),
		).toBe(false);
		expect(matchesFilters(game, { genre: "RPG" })).toBe(false);
		expect(matchesFilters(game, { maxHours: 9 })).toBe(false);
	});
	it("includes unknown estimates only explicitly with a duration limit", () => {
		const unknown = { ...game, hltbMain: null };
		expect(matchesFilters(unknown, {})).toBe(true);
		expect(matchesFilters(unknown, { maxHours: 10 })).toBe(false);
		expect(
			matchesFilters(unknown, { maxHours: 10, includeUnknownDuration: true }),
		).toBe(true);
	});
});
