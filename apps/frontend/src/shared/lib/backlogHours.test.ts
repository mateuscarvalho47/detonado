import { describe, expect, it } from "vitest";
import type { GameStatus, LibraryEntry } from "@/types/api";
import {
	backlogHours,
	backlogHoursLegend,
	formatBacklogHours,
} from "./backlogHours";

function entry(
	status: GameStatus,
	hltbMain: number | null,
	overrides: Partial<LibraryEntry> = {},
): LibraryEntry {
	return {
		id: overrides.id ?? `${status}-${hltbMain}`,
		igdbId: 1,
		name: "Game",
		genres: [],
		platforms: [],
		status,
		hoursPlayed: 40,
		hltbMain,
		hltbMainExtra: 80,
		hltbCompletionist: 120,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
		status,
		hltbMain,
	};
}

describe("backlogHours", () => {
	it("returns zeros for an empty list", () => {
		expect(backlogHours([])).toEqual({ total: 0, missing: 0, count: 0 });
	});

	it("sums only BACKLOG hltbMain and counts null as missing", () => {
		const summary = backlogHours([
			entry("BACKLOG", 10, { id: "a" }),
			entry("BACKLOG", 2.5, { id: "b" }),
			entry("BACKLOG", 0, { id: "c" }),
			entry("BACKLOG", null, { id: "d" }),
			entry("PLAYING", 100, { id: "e" }),
			entry("WISHLIST", null, { id: "f" }),
			entry("PAUSED", 8, { id: "g" }),
			entry("COMPLETED", 7, { id: "h", hoursPlayed: 99 }),
			entry("DROPPED", 6, { id: "i", hltbMainExtra: 50 }),
		]);

		expect(summary).toEqual({ total: 12.5, missing: 1, count: 4 });
	});

	it("includes 0 and does not treat it as missing", () => {
		expect(backlogHours([entry("BACKLOG", 0), entry("BACKLOG", 0)])).toEqual({
			total: 0,
			missing: 0,
			count: 2,
		});
	});

	it("does not let a null outside the queue increment missing", () => {
		expect(backlogHours([entry("PLAYING", null)])).toEqual({
			total: 0,
			missing: 0,
			count: 0,
		});
	});
});

describe("formatBacklogHours", () => {
	it("shows an integer when there is no fraction, including 0", () => {
		expect(formatBacklogHours(0)).toBe("0");
		expect(formatBacklogHours(12)).toBe("12");
		expect(formatBacklogHours(10.01)).toBe("10");
	});

	it("shows one decimal place when the rounded value has a fraction", () => {
		expect(formatBacklogHours(12.5)).toBe("12.5");
		expect(formatBacklogHours(1.25)).toBe("1.3");
		expect(formatBacklogHours(0.1 + 0.2)).toBe("0.3");
	});
});

describe("backlogHoursLegend", () => {
	it("says the queue is empty when there is no BACKLOG", () => {
		expect(backlogHoursLegend({ total: 0, missing: 0, count: 0 })).toBe(
			"A fila está vazia",
		);
	});

	it("counts games missing an estimate, with singular and plural", () => {
		expect(backlogHoursLegend({ total: 0, missing: 1, count: 1 })).toBe(
			"1 jogo da fila está sem estimativa",
		);
		expect(backlogHoursLegend({ total: 4, missing: 2, count: 3 })).toBe(
			"2 jogos da fila estão sem estimativa",
		);
	});

	it("does not call a queue of zeros empty", () => {
		expect(backlogHoursLegend({ total: 0, missing: 0, count: 2 })).toBe(
			"tempo principal da fila",
		);
	});
});
