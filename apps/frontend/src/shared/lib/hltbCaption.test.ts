import { describe, expect, it } from "vitest";
import { hltbCaption } from "./hltbCaption";

describe("hltbCaption", () => {
	it("stays quiet when times were found", () => {
		expect(hltbCaption("FOUND", true)).toBeNull();
		expect(hltbCaption("FOUND", false)).toBeNull();
	});

	it("separates a miss from a failed lookup", () => {
		expect(hltbCaption("MISS", false)).toBe("Sem tempo no HowLongToBeat.");
		expect(hltbCaption("FAILED", false)).toBe(
			"A consulta ao HowLongToBeat falhou.",
		);
	});

	it("treats an old entry without a status as not consulted", () => {
		expect(hltbCaption(null, false)).toBe("Tempo ainda não consultado.");
	});
});
