import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
	cleanSteamCallback,
	officialSteamUrl,
	readSteamCallback,
} from "../lib/steamCallback";
import {
	connectSteam,
	disconnectSteam,
	fetchSteamStatus,
	type SteamStatus,
	verifySteam,
} from "../service/steamService";
export function useSteamStatus() {
	return useQuery({
		queryKey: ["steam-status"],
		queryFn: fetchSteamStatus,
		staleTime: 60000,
	});
}
export function useSteamConnection(
	returnTo: "/account" | "/onboarding" = "/account",
) {
	const query = useSteamStatus();
	const qc = useQueryClient();
	const started = useRef(false);
	const [callbackError, setCallbackError] = useState<string | null>(null);
	const connect = useMutation({
		mutationFn: () => connectSteam(returnTo),
		onSuccess: ({ url }) => window.location.assign(officialSteamUrl(url)),
		retry: false,
	});
	const verify = useMutation({
		mutationFn: ({
			parameters,
			callbackUrl,
		}: {
			parameters: Record<string, string>;
			callbackUrl: string;
		}) => verifySteam(parameters, callbackUrl),
		retry: false,
		onSuccess: async ({ steamId }) => {
			await qc.cancelQueries({ queryKey: ["steam-status"] });
			qc.setQueryData<SteamStatus>(["steam-status"], (status) => ({
				configured: status?.configured ?? true,
				steamId,
			}));
		},
		onSettled: () => {
			window.history.replaceState(
				window.history.state,
				"",
				cleanSteamCallback(window.location.href),
			);
			void qc.invalidateQueries({ queryKey: ["steam-status"] });
		},
	});
	const disconnect = useMutation({
		mutationFn: disconnectSteam,
		retry: false,
		onSuccess: async () => {
			await qc.cancelQueries({ queryKey: ["steam-status"] });
			qc.setQueryData<SteamStatus>(["steam-status"], (status) => ({
				configured: status?.configured ?? true,
				steamId: null,
			}));
			verify.reset();
			qc.removeQueries({ queryKey: ["steam-preview"] });
		},
	});
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		try {
			const callback = readSteamCallback(window.location.href);
			if (callback) verify.mutate(callback);
		} catch (failure) {
			setCallbackError(
				failure instanceof Error
					? failure.message
					: "Não foi possível verificar a conexão Steam.",
			);
			window.history.replaceState(
				window.history.state,
				"",
				cleanSteamCallback(window.location.href),
			);
		}
	}, [verify.mutate]);
	return { query, connect, verify, disconnect, callbackError };
}
