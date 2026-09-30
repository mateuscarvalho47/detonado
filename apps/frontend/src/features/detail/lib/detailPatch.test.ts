import { describe, expect, it } from "vitest";
import { detailPatch } from "./detailPatch";

const base = {
	status: "PLAYING" as const,
	userPlatform: "PC",
	rating: 0,
	hoursPlayed: 0,
	notes: "",
	completedAt: "2024-01-02",
};

describe("detailPatch", () => {
	it("keeps zero hours and a zero rating", () => {
		const patch = detailPatch(base);
		expect(patch.hoursPlayed).toBe(0);
		expect(patch.rating).toBe(0);
		expect(JSON.stringify(patch)).toContain('"hoursPlayed":0');
	});

	it("clears an empty platform", () => {
		expect(detailPatch({ ...base, userPlatform: "   " }).userPlatform).toBe(
			null,
		);
	});

	it("clears the completion date when the status leaves Zerado", () => {
		expect(detailPatch({ ...base, status: "PAUSED" }).completedAt).toBe(null);
	});

	it("keeps the completion date while the status is Zerado", () => {
		expect(detailPatch({ ...base, status: "COMPLETED" }).completedAt).toBe(
			"2024-01-02",
		);
	});

	it("omits hours when the status has no progress field", () => {
		expect(detailPatch({ ...base, status: "BACKLOG" }).hoursPlayed).toBe(
			undefined,
		);
	});
});
