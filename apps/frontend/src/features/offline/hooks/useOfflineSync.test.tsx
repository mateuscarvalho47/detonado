import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { offlineIdentity, queuedSessions } from "../service/offlineService";
import { useOfflineSync } from "./useOfflineSync";

vi.mock("../service/offlineService", () => ({
	clearsOfflineQueries: (event: Event) =>
		event instanceof CustomEvent &&
		(event.detail?.type === "cleared" ||
			event.detail?.type === "identity-changed"),
	queuedSessions: vi.fn(),
	offlineIdentity: vi.fn(),
	hasPendingLogout: vi.fn().mockResolvedValue(false),
	isUsingCachedData: () => false,
	synchronizeOfflineSessions: vi.fn(),
	registerPendingInCurrentCampaign: vi.fn(),
	removeQueuedSession: vi.fn(),
	retryQueuedSession: vi.fn(),
}));
const game = { id: "entry", igdbId: 123, name: "Zelda" };
beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(queuedSessions).mockResolvedValue([]);
	vi.mocked(offlineIdentity).mockResolvedValue(undefined);
});
function setup() {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	client.setQueryData(["me"], { id: "alice" });
	client.setQueryData(["library"], [game]);
	const wrapper = ({ children }: PropsWithChildren) => (
		<QueryClientProvider client={client}>{children}</QueryClientProvider>
	);
	return { ...renderHook(() => useOfflineSync(true), { wrapper }), client };
}
it.each([
	"cleared",
	"identity-changed",
])("clears another tab's cached private queries on explicit %s", async (type) => {
	const { client } = setup();
	await waitFor(() => expect(queuedSessions).toHaveBeenCalled());
	act(() =>
		window.dispatchEvent(
			new CustomEvent("detonado:offline-change", { detail: { type } }),
		),
	);
	expect(client.getQueryData(["library"])).toBeUndefined();
	expect(client.getQueryData(["me"])).not.toEqual({ id: "alice" });
});
it("keeps online data when browser storage is unavailable without an explicit logout event", async () => {
	vi.mocked(offlineIdentity).mockRejectedValue(new Error("Storage disabled"));
	const { client } = setup();
	await waitFor(() => expect(offlineIdentity).toHaveBeenCalled());
	act(() =>
		window.dispatchEvent(
			new CustomEvent("detonado:offline-change", {
				detail: { type: "changed" },
			}),
		),
	);
	expect(client.getQueryData(["library"])).toEqual([game]);
	expect(client.getQueryData(["me"])).toEqual({ id: "alice" });
});
it("looks up pending game labels only in the same authenticated account's cached library", () => {
	const { result, client } = setup();
	const row = {
		ownerId: "alice",
		path: "/library/entry/sessions",
		payload: {
			clientId: "id",
			playedAt: "2026-10-14T12:00:00Z",
			durationMinutes: 30,
		},
		createdAt: "",
	};
	expect(result.current.gameForRow(row)).toEqual(game);
	expect(result.current.gameForRow({ ...row, ownerId: "bob" })).toBeUndefined();
	act(() => client.setQueryData(["me"], { id: "bob" }));
	expect(result.current.gameForRow(row)).toBeUndefined();
});
