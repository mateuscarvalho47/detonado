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

it("combines collection and tag membership, preserving empty-array behavior", () => {
	const grouped = {
		...game,
		collectionIds: ["collection"],
		tagIds: ["tag", "second"],
	};
	expect(
		matchesFilters(grouped, {
			collectionId: "collection",
			tagId: "tag",
			platform: "PC",
		}),
	).toBe(true);
	expect(
		matchesFilters(grouped, { collectionId: "missing", tagId: "tag" }),
	).toBe(false);
	expect(matchesFilters(game, { tagId: "tag" })).toBe(false);
	expect(matchesFilters(grouped, { tagId: "missing" })).toBe(false);
});

it("filters source kind before availability and handles mixed sources and expiry timezone boundaries", () => {
	const now = new Date("2026-10-14T13:00:00Z").getTime();
	const subscription = {
		id: "sub",
		kind: "SUBSCRIPTION" as const,
		label: "Pass",
		expiresAt: "2026-10-14T10:00:00-03:00",
		createdAt: "",
		updatedAt: "",
	};
	const store = {
		...subscription,
		id: "store",
		kind: "STORE" as const,
		label: "Steam",
		expiresAt: null,
	};
	const mixed = { ...game, sources: [subscription, store] };
	expect(matchesFilters(mixed, { availability: "AVAILABLE" }, now)).toBe(true);
	expect(
		matchesFilters(
			mixed,
			{ sourceKind: "SUBSCRIPTION", availability: "EXPIRED" },
			now,
		),
	).toBe(true);
	expect(
		matchesFilters(
			mixed,
			{ sourceKind: "SUBSCRIPTION", availability: "AVAILABLE" },
			now - 1,
		),
	).toBe(true);
	expect(matchesFilters(mixed, { availability: "EXPIRED" }, now)).toBe(false);
	expect(matchesFilters(game, { availability: "UNKNOWN" }, now)).toBe(true);
	expect(
		matchesFilters(game, { sourceKind: "STORE", availability: "UNKNOWN" }, now),
	).toBe(false);
	expect(matchesFilters(mixed, { sourceKind: "LOAN" }, now)).toBe(false);
});
