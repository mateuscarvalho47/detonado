import {
	blockOfflineReads,
	cachedResponse,
	clearOfflineData,
	clearsOfflineQueries,
	hasPendingLogout,
	markQueueConflict,
	notifyOfflineChange,
	offlineIdentity,
	queuedSessions,
	queueSession,
	rememberResponse,
	removeQueuedSession,
	replaceQueuedCampaign,
} from "./offlineStore";

type Transport = <T>(path: string, init?: RequestInit) => Promise<T>;
let transport: Transport;
let resetCsrf: () => void;
let generation = 0;
let synchronizing: Promise<void> | undefined;
let completingLogout: Promise<void> | undefined;
let usingCachedData = false;

globalThis.addEventListener("detonado:offline-change", (event) => {
	if (!clearsOfflineQueries(event)) return;
	generation += 1;
	usingCachedData = false;
	resetCsrf?.();
});

export function configureOfflineTransport(
	request: Transport,
	clearCsrf: () => void,
) {
	transport = request;
	resetCsrf = clearCsrf;
}

export function isUsingCachedData() {
	return usingCachedData;
}

function networkFailure(error: unknown) {
	return error instanceof TypeError;
}

function statusOf(error: unknown) {
	return error instanceof Error &&
		"status" in error &&
		typeof error.status === "number"
		? error.status
		: undefined;
}

async function optionalStorage(operation: Promise<unknown>) {
	// Online requests remain usable when browser storage is disabled or full.
	await operation.catch(() => undefined);
}

async function finishPendingLogout() {
	if (completingLogout) return completingLogout;
	completingLogout = (async () => {
		if (!(await hasPendingLogout().catch(() => false))) return;
		resetCsrf();
		await transport("/auth/logout", { method: "POST" });
		await clearOfflineData();
		resetCsrf();
	})().finally(() => {
		completingLogout = undefined;
	});
	return completingLogout;
}

async function hydrateIdentity() {
	try {
		const owner =
			(await offlineIdentity().catch(() => undefined))?.userId ?? null;
		const user = await transport("/auth/me");
		await optionalStorage(rememberResponse("/auth/me", user, owner));
	} catch (error) {
		if (statusOf(error) === 401) await optionalStorage(blockOfflineReads());
	}
}

function pendingSession(row: Awaited<ReturnType<typeof queueSession>>) {
	return {
		id: `offline:${row.payload.clientId}`,
		entryId: row.path.split("/")[2],
		...row.payload,
		notes: row.payload.notes ?? null,
		createdAt: row.createdAt,
		updatedAt: row.createdAt,
		pending: true,
	};
}

async function appendPendingSessions(path: string, data: unknown) {
	if (!/^\/library\/[^/?]+\/sessions(?:\?|$)/.test(path)) return data;
	if (
		typeof data !== "object" ||
		data === null ||
		!("sessions" in data) ||
		!Array.isArray(data.sessions)
	)
		return data;
	const base = path.split("?")[0];
	let campaignId = new URLSearchParams(path.split("?")[1]).get("campaignId");
	if (!campaignId) {
		const library = await cachedResponse("/library").catch(() => undefined);
		if (Array.isArray(library)) {
			const entry = library.find((game) => game?.id === base?.split("/")[2]);
			if (typeof entry?.activeCampaignId === "string")
				campaignId = entry.activeCampaignId;
		}
	}
	const existing = new Set(data.sessions.map((session) => session.clientId));
	const pending = (await queuedSessions().catch(() => [])).filter(
		(row) =>
			row.path === base &&
			!existing.has(row.payload.clientId) &&
			(!campaignId || row.payload.campaignId === campaignId),
	);
	return {
		...data,
		sessions: [...pending.map(pendingSession), ...data.sessions],
	};
}

export async function offlineRequest<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const method = (init.method ?? "GET").toUpperCase();
	const requestGeneration = generation;
	const ownerAtStart =
		(await offlineIdentity().catch(() => undefined))?.userId ?? null;
	try {
		if (path === "/auth/me" || path === "/auth/login")
			await finishPendingLogout();
		const response = await transport<T>(path, init);
		if (method === "GET") {
			if (generation !== requestGeneration) return response;
			await optionalStorage(rememberResponse(path, response, ownerAtStart));
			if (path === "/auth/me" && usingCachedData) {
				usingCachedData = false;
				notifyOfflineChange();
			}
			return (await appendPendingSessions(path, response)) as T;
		}
		if (
			path === "/auth/logout" ||
			(path === "/auth/account" && method === "DELETE")
		) {
			generation += 1;
			usingCachedData = false;
			await optionalStorage(clearOfflineData());
		} else if (path === "/auth/login") {
			generation += 1;
			resetCsrf();
			await hydrateIdentity();
		} else if (
			path === "/auth/preferences" ||
			path === "/auth/account" ||
			path === "/auth/consent"
		) {
			const previous = await cachedResponse("/auth/me").catch(() => undefined);
			if (
				generation === requestGeneration &&
				typeof previous === "object" &&
				previous !== null &&
				"id" in previous &&
				previous.id === ownerAtStart
			) {
				const changes =
					path === "/auth/consent"
						? { consentedAt: new Date().toISOString() }
						: response;
				if (typeof changes === "object" && changes !== null) {
					await optionalStorage(
						rememberResponse(
							"/auth/me",
							{ ...previous, ...changes },
							ownerAtStart,
						),
					);
				}
			}
		}
		return response;
	} catch (error) {
		if (statusOf(error) === 401 && generation === requestGeneration)
			await optionalStorage(blockOfflineReads(ownerAtStart));
		if (!networkFailure(error) || generation !== requestGeneration) throw error;
		if (method === "POST" && path === "/auth/logout") {
			generation += 1;
			usingCachedData = false;
			await clearOfflineData(true);
			resetCsrf();
			return undefined as T;
		}
		if (method === "GET") {
			const cached = await cachedResponse(path).catch(() => undefined);
			if (cached !== undefined) {
				usingCachedData = true;
				notifyOfflineChange();
				return (await appendPendingSessions(path, cached)) as T;
			}
			if (/^\/library\/[^/?]+\/sessions(?:\?|$)/.test(path)) {
				const base = path.split("?")[0];
				const pending = await queuedSessions().catch(() => []);
				if (pending.some((row) => row.path === base)) {
					usingCachedData = true;
					notifyOfflineChange();
					return (await appendPendingSessions(path, {
						sessions: [],
						offlineHistoryMissing: true,
					})) as T;
				}
			}
		}
		if (method === "POST" && /^\/library\/[^/?]+\/sessions$/.test(path)) {
			const row = await queueSession(
				path,
				JSON.parse(String(init.body)),
				ownerAtStart,
			);
			return pendingSession(row) as T;
		}
		throw error;
	}
}

async function synchronize() {
	await finishPendingLogout();
	if ((await queuedSessions()).length === 0 && !usingCachedData) return;
	const currentGeneration = generation;
	const owner = (await offlineIdentity())?.userId ?? null;
	let user: { id: string };
	try {
		user = await transport<{ id: string }>("/auth/me");
	} catch (error) {
		if (statusOf(error) === 401) await blockOfflineReads(owner);
		throw error;
	}
	await rememberResponse("/auth/me", user, owner);
	resetCsrf();
	for (const row of await queuedSessions()) {
		if (generation !== currentGeneration || row.ownerId !== user.id) break;
		if (row.error) continue;
		try {
			await transport(row.path, {
				method: "POST",
				body: JSON.stringify(row.payload),
			});
			if (generation !== currentGeneration) break;
			await removeQueuedSession(row.payload.clientId);
		} catch (error) {
			const status = statusOf(error);
			if (status === 401) {
				await blockOfflineReads(user.id);
				break;
			}
			if (!status || status >= 500 || status === 429) break;
			await markQueueConflict(
				row.payload.clientId,
				error instanceof Error
					? error.message
					: "Não foi possível sincronizar esta sessão.",
				status,
			);
		}
	}
	usingCachedData = false;
	notifyOfflineChange();
}

export function synchronizeOfflineSessions() {
	if (synchronizing) return synchronizing;
	const run = () => synchronize();
	synchronizing = (
		typeof navigator !== "undefined" && navigator.locks
			? navigator.locks.request("detonado-offline-sync", run)
			: run()
	).finally(() => {
		synchronizing = undefined;
	});
	return synchronizing;
}

export async function registerPendingInCurrentCampaign(
	clientId: string,
	newClientId: string,
) {
	const owner = (await offlineIdentity())?.userId ?? null;
	const user = await transport<{ id: string }>("/auth/me");
	await rememberResponse("/auth/me", user, owner);
	const row = (await queuedSessions()).find(
		(item) => item.payload.clientId === clientId,
	);
	if (!row || row.ownerId !== user.id)
		throw new Error("Esta pendência não pertence à conta atual.");
	const library =
		await transport<Array<{ id: string; activeCampaignId?: string | null }>>(
			"/library",
		);
	const entry = library.find((item) => item.id === row.path.split("/")[2]);
	if (!entry?.activeCampaignId)
		throw new Error("O jogo ou a campanha atual não está disponível.");
	await rememberResponse("/library", library, user.id);
	await replaceQueuedCampaign(
		clientId,
		entry.activeCampaignId,
		newClientId,
		user.id,
	);
}
