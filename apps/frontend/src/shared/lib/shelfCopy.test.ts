import { describe, expect, it } from "vitest";
import { firstSentence } from "./notes";
import { compareQueue, queueCaption } from "./queueOrder";

describe("firstSentence", () => {
	it("keeps the first sentence and ignores a blank note", () => {
		expect(firstSentence("Parei no Banco. Depois fui embora.")).toBe(
			"Parei no Banco.",
		);
		expect(firstSentence("sem ponto final")).toBe("sem ponto final");
		expect(firstSentence("primeira linha\nsegunda")).toBe("primeira linha");
		expect(firstSentence("   ")).toBeNull();
		expect(firstSentence(null)).toBeNull();
	});
});

describe("queueCaption", () => {
	it("shows the main estimate, or says it is missing", () => {
		expect(
			queueCaption({ hltbMain: 21, userPlatform: "PC", platforms: ["PS5"] }),
		).toBe("PC · 21h");
		expect(queueCaption({ hltbMain: 0, platforms: [] })).toBe("0h");
		expect(queueCaption({ hltbMain: null, platforms: ["Switch"] })).toBe(
			"Switch · sem estimativa",
		);
	});
});

describe("compareQueue", () => {
	it("orders by position and leaves an unnumbered game last", () => {
		const rows = [
			{ name: "c", queuePosition: 3, createdAt: "2024-01-01" },
			{ name: "a", queuePosition: 1, createdAt: "2024-03-01" },
			{ name: "b", queuePosition: null, createdAt: "2020-01-01" },
		];
		expect(
			rows
				.slice()
				.sort(compareQueue)
				.map((row) => row.name),
		).toEqual(["a", "c", "b"]);
	});
});
