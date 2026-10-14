import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	owner: "alice" as string | null,
	cache: {} as Record<string, unknown>,
	rows: [] as Array<{
		ownerId: string;
		path: string;
		payload: {
			clientId: string;
			playedAt: string;
			durationMinutes: number;
			notes: null;
			campaignId: string;
		};
		createdAt: string;
		error?: string;
		status?: number;
	}>,
	logout: false,
}));
const store = vi.hoisted(() => ({
	blockOfflineReads: vi.fn(),
	clearOfflineData: vi.fn(),
	queueSession: vi.fn(),
	markQueueConflict: vi.fn(),
	removeQueuedSession: vi.fn(),
	rememberResponse: vi.fn(),
}));
vi.mock("./offlineStore", () => ({
	...store,
	clearsOfflineQueries: (event: Event) =>
		event instanceof CustomEvent &&
		(event.detail?.type === "cleared" ||
			event.detail?.type === "identity-changed"),
	notifyOfflineChange: vi.fn(),
	hasPendingLogout: async () => state.logout,
	offlineIdentity: async () =>
		state.owner ? { userId: state.owner, readable: true } : undefined,
	cachedResponse: async (path: string) => state.cache[path],
	queuedSessions: async () =>
		state.rows.filter((row) => row.ownerId === state.owner),
	replaceQueuedCampaign: vi.fn(),
}));
let offline: typeof import("./offlineRequests");
const row = () => ({
	ownerId: "alice",
	path: "/library/entry/sessions",
	payload: {
		clientId: "078f5bf0-3cd9-4c6e-bfa0-8d8ef84aa092",
		playedAt: "2026-10-14T12:00:00.000Z",
		durationMinutes: 45,
		notes: null,
		campaignId: "campaign",
	},
	createdAt: "2026-10-14T12:01:00.000Z",
});
const failure = (status: number) =>
	Object.assign(new Error(`HTTP ${status}`), { status });

beforeEach(async () => {
	vi.resetModules();
	vi.clearAllMocks();
	state.owner = "alice";
	state.cache = {};
	state.rows = [];
	state.logout = false;
	store.blockOfflineReads.mockResolvedValue(undefined);
	store.clearOfflineData.mockImplementation(async (pending = false) => {
		state.rows = [];
		state.cache = {};
		state.owner = null;
		state.logout = pending;
	});
	store.rememberResponse.mockImplementation(
		async (path: string, data: unknown, expected?: string | null) => {
			if (expected !== undefined && expected !== state.owner) return;
			if (
				path === "/auth/me" &&
				typeof data === "object" &&
				data &&
				"id" in data &&
				typeof data.id === "string"
			) {
				if (data.id !== state.owner) {
					state.rows = [];
					state.cache = {};
				}
				state.owner = data.id;
			}
			state.cache[path] = data;
		},
	);
	store.removeQueuedSession.mockImplementation(async (id: string) => {
		state.rows = state.rows.filter((item) => item.payload.clientId !== id);
	});
	store.markQueueConflict.mockImplementation(
		async (id: string, error: string, status: number) => {
			state.rows = state.rows.map((item) =>
				item.payload.clientId === id ? { ...item, error, status } : item,
			);
		},
	);
	store.queueSession.mockImplementation(
		async (path: string, payload: ReturnType<typeof row>["payload"]) => {
			const saved = { ...row(), path, payload };
			state.rows.push(saved);
			return saved;
		},
	);
	offline = await import("./offlineRequests");
});

it("reads saved library only for network failure, preserving HTTP errors", async () => {
	state.cache["/library"] = [{ id: "entry" }];
	const transport = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
	offline.configureOfflineTransport(transport, vi.fn());
	expect(await offline.offlineRequest("/library")).toEqual([{ id: "entry" }]);
	expect(offline.isUsingCachedData()).toBe(true);
	transport.mockRejectedValue(failure(503));
	await expect(offline.offlineRequest("/library")).rejects.toMatchObject({
		status: 503,
	});
	transport.mockRejectedValue(failure(401));
	await expect(offline.offlineRequest("/library")).rejects.toMatchObject({
		status: 401,
	});
	expect(store.blockOfflineReads).toHaveBeenCalledWith("alice");
});

it("queues a session with the same UUID and owner, without queueing other mutations", async () => {
	const transport = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
	offline.configureOfflineTransport(transport, vi.fn());
	const saved = await offline.offlineRequest<{
		pending: boolean;
		clientId: string;
	}>(row().path, { method: "POST", body: JSON.stringify(row().payload) });
	expect(saved.pending).toBe(true);
	expect(saved.clientId).toBe(row().payload.clientId);
	expect(store.queueSession).toHaveBeenCalledWith(
		row().path,
		row().payload,
		"alice",
	);
	await expect(
		offline.offlineRequest("/library/entry", { method: "PATCH", body: "{}" }),
	).rejects.toThrow();
	expect(store.queueSession).toHaveBeenCalledTimes(1);
	transport.mockRejectedValue(failure(409));
	await expect(
		offline.offlineRequest(row().path, {
			method: "POST",
			body: JSON.stringify(row().payload),
		}),
	).rejects.toMatchObject({ status: 409 });
	expect(store.queueSession).toHaveBeenCalledTimes(1);
});

it("does not send another account's pending sessions", async () => {
	state.rows = [row()];
	const transport = vi.fn().mockResolvedValue({ id: "bob" });
	offline.configureOfflineTransport(transport, vi.fn());
	await offline.synchronizeOfflineSessions();
	expect(transport).toHaveBeenCalledTimes(1);
	expect(transport).toHaveBeenCalledWith("/auth/me");
	expect(state.rows).toHaveLength(0);
});

it("keeps conflicts for user resolution and continues independent sessions", async () => {
	const second = {
		...row(),
		payload: {
			...row().payload,
			clientId: "d51db3fc-9ffc-445a-b2b5-3975280d09db",
		},
	};
	state.rows = [row(), second];
	const transport = vi
		.fn()
		.mockImplementation(async (path: string, init?: RequestInit) => {
			if (path === "/auth/me") return { id: "alice" };
			if (String(init?.body).includes(row().payload.clientId))
				throw failure(409);
			return {};
		});
	offline.configureOfflineTransport(transport, vi.fn());
	await offline.synchronizeOfflineSessions();
	expect(state.rows).toHaveLength(1);
	expect(state.rows[0]?.status).toBe(409);
	expect(store.removeQueuedSession).toHaveBeenCalledWith(
		second.payload.clientId,
	);
	await offline.synchronizeOfflineSessions();
	expect(
		transport.mock.calls.filter(([, init]) => init?.method === "POST"),
	).toHaveLength(2);
});

it("replays the original UUID when local removal fails after a server commit", async () => {
	state.rows = [row()];
	const committed = new Set<string>();
	const transport = vi
		.fn()
		.mockImplementation(async (path: string, init?: RequestInit) => {
			if (path === "/auth/me") return { id: "alice" };
			committed.add(JSON.parse(String(init?.body)).clientId);
			return {};
		});
	store.removeQueuedSession.mockRejectedValueOnce(new Error("disk failure"));
	offline.configureOfflineTransport(transport, vi.fn());
	await offline.synchronizeOfflineSessions();
	expect(state.rows).toHaveLength(1);
	await offline.synchronizeOfflineSessions();
	expect(committed.size).toBe(1);
	expect(state.rows).toHaveLength(0);
});

it("clears private data on offline logout and completes logout before reading identity", async () => {
	state.rows = [row()];
	state.cache["/auth/me"] = { id: "alice" };
	const transport = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
	offline.configureOfflineTransport(transport, vi.fn());
	await offline.offlineRequest("/auth/logout", { method: "POST" });
	expect(state.cache).toEqual({});
	expect(state.rows).toHaveLength(0);
	expect(state.logout).toBe(true);
	transport.mockImplementation(async (path: string) => {
		if (path === "/auth/logout") return undefined;
		throw failure(401);
	});
	await expect(offline.offlineRequest("/auth/me")).rejects.toMatchObject({
		status: 401,
	});
	expect(transport.mock.calls.slice(-2).map(([path]) => path)).toEqual([
		"/auth/logout",
		"/auth/me",
	]);
	expect(state.logout).toBe(false);
});

it("does not cache a late response under a newly signed-in account", async () => {
	let resolve!: (body: unknown) => void;
	const transport = vi.fn().mockImplementation(
		() =>
			new Promise((done) => {
				resolve = done;
			}),
	);
	offline.configureOfflineTransport(transport, vi.fn());
	const pending = offline.offlineRequest("/library");
	await vi.waitFor(() => expect(transport).toHaveBeenCalled());
	state.owner = "bob";
	state.cache["/library"] = [{ id: "bob-game" }];
	resolve([{ id: "alice-game" }]);
	await pending;
	expect(state.cache["/library"]).toEqual([{ id: "bob-game" }]);
});

it.each([
	"cleared",
	"identity-changed",
])("does not remember a delayed initial identity after explicit %s", async (type) => {
	state.owner = null;
	let resolveResponse: ((value: { id: string }) => void) | undefined;
	const transport = vi.fn(
		() =>
			new Promise<{ id: string }>((resolve) => {
				resolveResponse = resolve;
			}),
	);
	const reset = vi.fn();
	offline.configureOfflineTransport(transport, reset);
	const pending = offline.offlineRequest("/auth/me");
	await vi.waitFor(() => expect(transport).toHaveBeenCalled());
	globalThis.dispatchEvent(
		new CustomEvent("detonado:offline-change", { detail: { type } }),
	);
	resolveResponse?.({ id: "alice" });
	await pending;
	expect(store.rememberResponse).not.toHaveBeenCalled();
	expect(state.owner).toBeNull();
	expect(reset).toHaveBeenCalledOnce();
});
