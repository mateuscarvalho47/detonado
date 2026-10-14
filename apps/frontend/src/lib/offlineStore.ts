import { z } from "zod";

const DATABASE = "detonado-offline-v1";
const TTL = 7 * 24 * 60 * 60 * 1000;
const identitySchema = z.object({
	userId: z.string(),
	readable: z.boolean(),
	updatedAt: z.number(),
});
const cacheSchema = z.object({
	ownerId: z.string(),
	savedAt: z.number(),
	data: z.unknown(),
});
export const queuedPayloadSchema = z.object({
	clientId: z.uuid(),
	playedAt: z.iso.datetime({ offset: true }),
	durationMinutes: z.number().int().min(1).max(1440),
	notes: z.string().max(4000).nullable().optional(),
	campaignId: z.string().nullable().optional(),
});
const queuedSessionSchema = z.object({
	ownerId: z.string(),
	path: z.string().regex(/^\/library\/[^/?]+\/sessions$/),
	payload: queuedPayloadSchema,
	createdAt: z.string(),
	error: z.string().optional(),
	status: z.number().optional(),
});
export type QueuedSession = z.infer<typeof queuedSessionSchema>;
type RecordValue = { key: string; value: unknown };
let connection: Promise<IDBDatabase> | undefined;
const channel =
	typeof window !== "undefined" && "BroadcastChannel" in window
		? new BroadcastChannel("detonado-offline")
		: undefined;
const offlineChangeSchema = z.object({
	type: z.enum(["changed", "cleared", "identity-changed"]),
});
export type OfflineChangeType = z.infer<typeof offlineChangeSchema>["type"];
function dispatchOfflineChange(type: OfflineChangeType) {
	globalThis.dispatchEvent(
		new CustomEvent("detonado:offline-change", { detail: { type } }),
	);
}
export function clearsOfflineQueries(event: Event) {
	if (!(event instanceof CustomEvent)) return false;
	const parsed = offlineChangeSchema.safeParse(event.detail);
	return (
		parsed.success &&
		(parsed.data.type === "cleared" || parsed.data.type === "identity-changed")
	);
}
if (channel)
	channel.onmessage = (event) => {
		const parsed = offlineChangeSchema.safeParse(
			event.data === "changed" ? { type: "changed" } : event.data,
		);
		if (parsed.success) dispatchOfflineChange(parsed.data.type);
	};

function openDatabase() {
	if (connection) return connection;
	connection = new Promise<IDBDatabase>((resolve, reject) => {
		if (!globalThis.indexedDB) {
			reject(new Error("Armazenamento offline indisponível neste navegador."));
			return;
		}
		const request = indexedDB.open(DATABASE, 1);
		request.onupgradeneeded = () => {
			request.result.createObjectStore("records", { keyPath: "key" });
		};
		request.onsuccess = () => {
			const database = request.result;
			database.onversionchange = () => {
				database.close();
				connection = undefined;
			};
			resolve(database);
		};
		request.onerror = () => reject(request.error);
		request.onblocked = () =>
			reject(new Error("Feche outras abas para ativar o modo offline."));
	}).catch((error: unknown) => {
		connection = undefined;
		throw error;
	});
	return connection;
}

function result<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function transaction<T>(
	mode: IDBTransactionMode,
	operation: (store: IDBObjectStore) => Promise<T>,
) {
	const database = await openDatabase();
	const tx = database.transaction("records", mode);
	const completed = new Promise<void>((resolve, reject) => {
		tx.oncomplete = () => resolve();
		tx.onabort = () =>
			reject(tx.error ?? new Error("Falha ao gravar os dados offline."));
		tx.onerror = () => reject(tx.error);
	});
	try {
		const value = await operation(tx.objectStore("records"));
		await completed;
		return value;
	} catch (error) {
		try {
			tx.abort();
		} catch {
			/* The failed transaction may already be closed. */
		}
		await completed.catch(() => undefined);
		throw error;
	}
}

async function read<S extends z.ZodType>(
	store: IDBObjectStore,
	key: string,
	schema: S,
) {
	const row: RecordValue | undefined = await result(store.get(key));
	const parsed = schema.safeParse(row?.value);
	return parsed.success ? parsed.data : undefined;
}

function write(store: IDBObjectStore, key: string, value: unknown) {
	return result(store.put({ key, value }));
}

export function notifyOfflineChange(type: OfflineChangeType = "changed") {
	dispatchOfflineChange(type);
	channel?.postMessage({ type });
}

export function canCacheOffline(path: string) {
	if (path.startsWith("/library/steam/")) return false;
	return (
		path === "/auth/me" ||
		path === "/games/platforms" ||
		/^\/library(?:\/|\?|$)/.test(path)
	);
}

export async function rememberResponse(
	path: string,
	data: unknown,
	expectedOwner?: string | null,
) {
	if (!canCacheOffline(path)) return;
	let identityChanged = false;
	await transaction("readwrite", async (store) => {
		let identity = await read(store, "identity", identitySchema);
		if (
			expectedOwner !== undefined &&
			(identity?.userId ?? null) !== expectedOwner
		)
			return;
		if (path === "/auth/me") {
			const user = z.object({ id: z.string() }).safeParse(data);
			if (!user.success) return;
			if (identity && identity.userId !== user.data.id) {
				identityChanged = true;
				await result(store.clear());
			}
			identity = {
				userId: user.data.id,
				readable: true,
				updatedAt: Date.now(),
			};
			await write(store, "identity", identity);
		}
		if (!identity?.readable) return;
		await write(store, `cache:${path}`, {
			ownerId: identity.userId,
			savedAt: Date.now(),
			data,
		});
	});
	if (path === "/auth/me")
		notifyOfflineChange(identityChanged ? "identity-changed" : "changed");
}

export async function offlineIdentity() {
	return transaction("readonly", (store) =>
		read(store, "identity", identitySchema),
	);
}

export async function cachedResponse(path: string): Promise<unknown> {
	if (!canCacheOffline(path)) return undefined;
	return transaction("readonly", async (store) => {
		const identity = await read(store, "identity", identitySchema);
		if (!identity?.readable || Date.now() - identity.updatedAt > TTL)
			return undefined;
		const cache = await read(store, `cache:${path}`, cacheSchema);
		if (
			!cache ||
			cache.ownerId !== identity.userId ||
			Date.now() - cache.savedAt > TTL
		)
			return undefined;
		return cache.data;
	});
}

export async function clearOfflineData(pendingLogout = false) {
	await transaction("readwrite", async (store) => {
		await result(store.clear());
		if (pendingLogout) await write(store, "pendingLogout", true);
	});
	notifyOfflineChange("cleared");
}

export async function hasPendingLogout() {
	return transaction("readonly", async (store) =>
		Boolean(await read(store, "pendingLogout", z.boolean())),
	);
}

export async function blockOfflineReads(expectedOwner?: string | null) {
	await transaction("readwrite", async (store) => {
		const identity = await read(store, "identity", identitySchema);
		if (
			expectedOwner !== undefined &&
			(identity?.userId ?? null) !== expectedOwner
		)
			return;
		if (identity)
			await write(store, "identity", { ...identity, readable: false });
	});
	notifyOfflineChange();
}

async function queueInStore(store: IDBObjectStore) {
	const rows: RecordValue[] = await result(
		store.getAll(IDBKeyRange.bound("session:", "session:\uffff")),
	);
	return rows.flatMap((row) => {
		const parsed = queuedSessionSchema.safeParse(row.value);
		return parsed.success ? [parsed.data] : [];
	});
}

export async function queuedSessions() {
	return transaction("readonly", async (store) => {
		const identity = await read(store, "identity", identitySchema);
		return (await queueInStore(store)).filter(
			(row) => row.ownerId === identity?.userId,
		);
	});
}

export async function queueSession(
	path: string,
	body: unknown,
	expectedOwner?: string | null,
): Promise<QueuedSession> {
	const payload = queuedPayloadSchema.parse(body);
	const saved = await transaction("readwrite", async (store) => {
		const identity = await read(store, "identity", identitySchema);
		if (expectedOwner !== undefined && identity?.userId !== expectedOwner)
			throw new Error(
				"A conta mudou. Confira sua sessão antes de registrar offline.",
			);
		if (!identity?.readable || Date.now() - identity.updatedAt > TTL) {
			throw new Error(
				"Entre na conta com conexão antes de registrar sessões offline.",
			);
		}
		const key = `session:${payload.clientId}`;
		const existing = await read(store, key, queuedSessionSchema);
		if (existing) {
			if (
				existing.ownerId !== identity.userId ||
				existing.path !== path ||
				JSON.stringify(existing.payload) !== JSON.stringify(payload)
			) {
				throw new Error(
					"Identificador de sessão já usado com outros dados locais.",
				);
			}
			return existing;
		}
		if ((await queueInStore(store)).length >= 100)
			throw new Error(
				"Sincronize as sessões pendentes antes de registrar mais.",
			);
		const row = queuedSessionSchema.parse({
			ownerId: identity.userId,
			path,
			payload,
			createdAt: new Date().toISOString(),
		});
		await write(store, key, row);
		return row;
	});
	notifyOfflineChange();
	return saved;
}

export async function removeQueuedSession(clientId: string) {
	await transaction("readwrite", async (store) => {
		await result(store.delete(`session:${clientId}`));
	});
	notifyOfflineChange();
}

export async function markQueueConflict(
	clientId: string,
	error: string,
	status?: number,
) {
	await transaction("readwrite", async (store) => {
		const key = `session:${clientId}`;
		const row = await read(store, key, queuedSessionSchema);
		if (row) await write(store, key, { ...row, error, status });
	});
	notifyOfflineChange();
}

export async function retryQueuedSession(clientId: string) {
	await transaction("readwrite", async (store) => {
		const key = `session:${clientId}`;
		const row = await read(store, key, queuedSessionSchema);
		if (row) {
			const { error: _error, status: _status, ...pending } = row;
			await write(store, key, pending);
		}
	});
	notifyOfflineChange();
}

export async function replaceQueuedCampaign(
	clientId: string,
	campaignId: string,
	newClientId: string,
	ownerId: string,
) {
	await transaction("readwrite", async (store) => {
		const row = await read(store, `session:${clientId}`, queuedSessionSchema);
		const identity = await read(store, "identity", identitySchema);
		if (
			!row ||
			row.ownerId !== ownerId ||
			identity?.userId !== ownerId ||
			!identity.readable
		) {
			throw new Error(
				"A conta mudou. Confira as pendências antes de continuar.",
			);
		}
		const { error: _error, status: _status, ...pending } = row;
		await write(
			store,
			`session:${newClientId}`,
			queuedSessionSchema.parse({
				...pending,
				payload: { ...row.payload, clientId: newClientId, campaignId },
			}),
		);
		await result(store.delete(`session:${clientId}`));
	});
	notifyOfflineChange();
}
