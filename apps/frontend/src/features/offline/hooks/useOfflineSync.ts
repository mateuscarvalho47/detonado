import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { createSessionId } from "@/features/sessions/lib/sessionId";
import type { User } from "@/types/api";
import {
	clearsOfflineQueries,
	hasPendingLogout,
	isUsingCachedData,
	offlineIdentity,
	type QueuedSession,
	queuedSessions,
	registerPendingInCurrentCampaign,
	removeQueuedSession,
	retryQueuedSession,
	synchronizeOfflineSessions,
} from "../service/offlineService";

const REFRESH_KEYS = [
	"me",
	"library",
	"sessions",
	"campaigns",
	"stats",
	"retrospective",
	"checklist",
	"organization",
	"saved-filters",
	"journal",
	"sources",
];

export function useOfflineSync(authenticated: boolean) {
	const client = useQueryClient();
	const { data: library } = useLibrary({ enabled: false });
	const [rows, setRows] = useState<QueuedSession[]>([]);
	const [cached, setCached] = useState(false);
	const [online, setOnline] = useState(() => navigator.onLine);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");

	const refresh = useCallback(async () => {
		const [pending, identity] = await Promise.all([
			queuedSessions(),
			offlineIdentity(),
		]);
		const me = client.getQueryData<User | null>(["me"]);
		if (me && identity && me.id !== identity.userId) client.clear();
		setRows(pending);
		setCached(isUsingCachedData());
		setOnline(navigator.onLine);
	}, [client]);

	const synchronize = useCallback(async () => {
		try {
			const [pending, logout] = await Promise.all([
				queuedSessions(),
				hasPendingLogout(),
			]);
			if (!pending.length && !isUsingCachedData() && !logout) return;
			if (!authenticated && pending.length && !logout) return;
			setBusy(true);
			setError("");
			await synchronizeOfflineSessions();
			await Promise.all(
				REFRESH_KEYS.map((key) =>
					client.invalidateQueries({ queryKey: [key] }),
				),
			);
		} catch (failure) {
			if (
				failure instanceof Error &&
				"status" in failure &&
				failure.status === 401
			) {
				setError(
					"Entre novamente na mesma conta para sincronizar suas sessões.",
				);
				void client.invalidateQueries({ queryKey: ["me"] });
			} else
				setError(
					failure instanceof TypeError
						? "Ainda não foi possível conectar. Suas pendências continuam salvas."
						: failure instanceof Error
							? failure.message
							: "Não foi possível sincronizar.",
				);
		} finally {
			setBusy(false);
			await refresh().catch(() => undefined);
		}
	}, [authenticated, client, refresh]);

	useEffect(() => {
		const update = (event?: Event) => {
			if (event && clearsOfflineQueries(event)) {
				client.setQueryData(["me"], null);
				client.clear();
			}
			void refresh().catch(() => undefined);
		};
		const reconnect = () => {
			update();
			void synchronize();
		};
		update();
		void synchronize();
		window.addEventListener("online", reconnect);
		window.addEventListener("offline", update);
		window.addEventListener("detonado:offline-change", update);
		window.addEventListener("focus", reconnect);
		return () => {
			window.removeEventListener("online", reconnect);
			window.removeEventListener("offline", update);
			window.removeEventListener("detonado:offline-change", update);
			window.removeEventListener("focus", reconnect);
		};
	}, [refresh, synchronize, client]);

	const hasPendingSend = rows.some((row) => !row.error);
	useEffect(() => {
		if (!hasPendingSend && !cached) return;
		const timer = window.setInterval(() => {
			if (navigator.onLine) void synchronize();
		}, 30000);
		return () => window.clearInterval(timer);
	}, [hasPendingSend, cached, synchronize]);

	async function action(operation: () => Promise<void>) {
		try {
			setError("");
			setBusy(true);
			await operation();
			await refresh();
		} catch (failure) {
			setError(
				failure instanceof Error
					? failure.message
					: "Não foi possível atualizar a pendência.",
			);
		} finally {
			setBusy(false);
		}
	}

	return {
		rows,
		gameForRow: (row: QueuedSession) =>
			row.ownerId === client.getQueryData<User | null>(["me"])?.id
				? library?.find((game) => game.id === row.path.split("/")[2])
				: undefined,
		cached,
		online,
		busy,
		error,
		synchronize,
		discard: (row: QueuedSession) =>
			action(async () => {
				await removeQueuedSession(row.payload.clientId);
				await client.invalidateQueries({ queryKey: ["sessions"] });
			}),
		retry: (row: QueuedSession) =>
			action(async () => {
				await retryQueuedSession(row.payload.clientId);
				await synchronize();
			}),
		move: (row: QueuedSession) =>
			action(async () => {
				await registerPendingInCurrentCampaign(
					row.payload.clientId,
					createSessionId(),
				);
				await synchronize();
			}),
	};
}
