import { afterEach, expect, it, vi } from "vitest";

class TestChannel {
	static current: TestChannel;
	onmessage?: (event: { data: unknown }) => void;
	postMessage = vi.fn();
	constructor() {
		TestChannel.current = this;
	}
}
afterEach(() => vi.unstubAllGlobals());
it("broadcasts explicit private-data removal and validates incoming cross-tab event types", async () => {
	vi.resetModules();
	vi.stubGlobal("BroadcastChannel", TestChannel);
	const store = await import("./offlineStore");
	const events: Event[] = [];
	const listener = (event: Event) => events.push(event);
	window.addEventListener("detonado:offline-change", listener);
	try {
		store.notifyOfflineChange("cleared");
		expect(TestChannel.current.postMessage).toHaveBeenCalledWith({
			type: "cleared",
		});
		expect(store.clearsOfflineQueries(events[0])).toBe(true);
		TestChannel.current.onmessage?.({ data: { type: "identity-changed" } });
		expect(store.clearsOfflineQueries(events[1])).toBe(true);
		TestChannel.current.onmessage?.({ data: { type: "changed" } });
		expect(store.clearsOfflineQueries(events[2])).toBe(false);
		TestChannel.current.onmessage?.({ data: { type: "unknown" } });
		expect(events).toHaveLength(3);
	} finally {
		window.removeEventListener("detonado:offline-change", listener);
	}
});

it("never caches session-scoped Steam verification state", async () => {
	const { canCacheOffline } = await import("./offlineStore");
	expect(canCacheOffline("/library/steam/status")).toBe(false);
	expect(canCacheOffline("/library/steam/preview")).toBe(false);
	expect(canCacheOffline("/library")).toBe(true);
});
