import { describe, expect, it } from "vitest";
import type { LibraryEntry } from "@/types/api";
import { suggestGames } from "./suggestGames";

const filters = { platform: "", genre: "", maxHours: "" as const };
function game(id: string, overrides: Partial<LibraryEntry> = {}): LibraryEntry {
	return {
		id,
		igdbId: Number(id),
		name: `Game ${id}`,
		status: "BACKLOG",
		userPlatform: "PC",
		platforms: ["PC", "PS5"],
		genres: ["Adventure"],
		hltbMain: 10,
		hltbMainExtra: null,
		hltbCompletionist: null,
		createdAt: "",
		updatedAt: "",
		...overrides,
	};
}
describe("play next suggestions", () => {
	it("prioritizes preferred platform without excluding others and returns up to three", () => {
		const library = [
			game("1", { userPlatform: "PS5", queuePosition: 1 }),
			game("2", { userPlatform: "PC", queuePosition: 2 }),
			game("3", { userPlatform: "PS5", status: "PAUSED" }),
			game("4", { userPlatform: "PS5" }),
		];
		const result = suggestGames(library, filters, "PC");
		expect(result.map((item) => item.game.id)).toEqual(["2", "1", "3"]);
		expect(result[0]?.reasons).toContain("Na sua plataforma preferida");
	});
	it("combines manual platform, genre and total duration without subtracting hours already played", () => {
		const library = [
			game("1", { userPlatform: "PS5", hoursPlayed: 9 }),
			game("2", { userPlatform: "PC" }),
			game("3", { userPlatform: "PS5", hltbMain: 30, hoursPlayed: 29 }),
			game("4", { userPlatform: "PS5", genres: ["RPG"] }),
			game("5", { userPlatform: "PS5", hltbMain: null }),
		];
		const result = suggestGames(
			library,
			{ platform: "PS5", genre: "Adventure", maxHours: 10 },
			"PC",
		);
		expect(result.map((item) => item.game.id)).toEqual(["1"]);
		expect(result[0]?.reasons).not.toContain("Na sua plataforma preferida");
	});
	it("excludes completed, dropped, wishlist and playing; retains unknown duration without a limit", () => {
		const library = [
			game("1", { status: "COMPLETED" }),
			game("2", { status: "DROPPED" }),
			game("3", { status: "WISHLIST" }),
			game("4", { status: "PLAYING" }),
			game("5", { status: "PAUSED", hltbMain: null }),
		];
		expect(suggestGames(library, filters).map((item) => item.game.id)).toEqual([
			"5",
		]);
		expect(suggestGames(library, { ...filters, maxHours: 10 })).toEqual([]);
	});
	it("breaks equal queue positions by name then id regardless of input order", () => {
		const library = [
			game("3", { name: "Zelda", queuePosition: 2 }),
			game("2", { name: "Alpha", queuePosition: 2 }),
			game("1", { name: "Alpha", queuePosition: 2 }),
		];
		expect(suggestGames(library, filters).map((item) => item.game.id)).toEqual([
			"1",
			"2",
			"3",
		]);
		expect(
			suggestGames([...library].reverse(), filters).map((item) => item.game.id),
		).toEqual(["1", "2", "3"]);
	});
});
