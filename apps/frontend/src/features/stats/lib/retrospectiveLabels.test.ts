import { expect, it } from "vitest";
import { calendarLabel, deltaLabel, periodLabel } from "./retrospectiveLabels";

it("formats calendar dates without interpreting UTC midnight in another timezone", () => {
	expect(calendarLabel("2026-10-01")).toBe("01/10/2026");
	expect(calendarLabel("2026-01")).toBe("Janeiro de 2026");
	expect(periodLabel({ year: 2026, month: 10 })).toBe("Outubro de 2026");
	expect(periodLabel({ year: 2026, month: null })).toBe("2026");
});
it("formats absolute deltas including zero and small hour differences", () => {
	expect(deltaLabel(0)).toBe("0");
	expect(deltaLabel(-0)).toBe("0");
	expect(deltaLabel(1)).toBe("+1");
	expect(deltaLabel(-1)).toBe("-1");
	expect(deltaLabel(1 / 60)).toBe("+0,02");
	expect(deltaLabel(-0.0000001)).toBe("0");
});
