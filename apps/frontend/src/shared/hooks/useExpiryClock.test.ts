import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useExpiryClock } from "./useExpiryClock";

afterEach(() => vi.useRealTimers());
it("updates at an upcoming expiration and stops ticking once no future expirations remain", () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-10-14T13:00:00.000Z"));
	const expirations = ["2026-10-14T13:00:01.000Z"];
	const { result } = renderHook(() => useExpiryClock(expirations, true));
	expect(vi.getTimerCount()).toBe(1);
	act(() => vi.advanceTimersByTime(1000));
	expect(result.current).toBe(new Date(expirations[0]).getTime());
	expect(vi.getTimerCount()).toBe(0);
});
it("schedules no clock work when disabled or only permanent sources exist", () => {
	vi.useFakeTimers();
	renderHook(() => useExpiryClock([null], false));
	renderHook(() => useExpiryClock([null], true));
	expect(vi.getTimerCount()).toBe(0);
});
