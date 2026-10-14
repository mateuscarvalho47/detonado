import { describe, expect, it } from "vitest";
import { validateLibrarySearch } from "./librarySearch";

describe("library URL criteria", () => {
	it("keeps valid criteria while rejecting malformed fields and unknown keys", () => {
		expect(
			validateLibrarySearch({
				statuses: ["BACKLOG"],
				collectionId: "deleted-collection",
				search: "zelda",
				maxHours: -1,
				view: "table",
				platform: "x".repeat(201),
				availability: "EXPIRED",
				other: "ignored",
			}),
		).toEqual({
			statuses: ["BACKLOG"],
			collectionId: "deleted-collection",
			search: "zelda",
			availability: "EXPIRED",
		});
	});
	it("round trips combined criteria used by a detail return link", () => {
		const criteria = {
			statuses: ["PLAYING", "BACKLOG"],
			sort: "queue",
			view: "grid",
			maxHours: 12.5,
			includeUnknownDuration: true,
			tagId: "tag",
			sourceKind: "LOAN",
			genre: "RPG",
		};
		expect(validateLibrarySearch(JSON.parse(JSON.stringify(criteria)))).toEqual(
			criteria,
		);
	});
});
