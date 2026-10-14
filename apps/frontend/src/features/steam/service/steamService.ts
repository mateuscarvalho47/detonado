import { api } from "@/lib/api";
import type { GameSearchResult } from "@/types/api";
export interface SteamStatus {
	configured: boolean;
	steamId: string | null;
}
export interface SteamGame {
	appId: number;
	name: string;
	hoursPlayed: number;
	match: GameSearchResult | null;
	duplicate: boolean;
	userPlatform: string | null;
}
export interface SteamPreview {
	steamId: string;
	total: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	rows: SteamGame[];
}
export function fetchSteamStatus() {
	return api.get<SteamStatus>("/library/steam/status");
}
export function connectSteam(
	returnTo: "/account" | "/onboarding" = "/account",
) {
	return api.post<{ url: string }>("/library/steam/connect", {
		authorizationVersion: "2026-10-14",
		returnTo,
	});
}
export function verifySteam(
	parameters: Record<string, string>,
	callbackUrl: string,
) {
	return api.post<{ steamId: string }>("/library/steam/verify", {
		parameters,
		callbackUrl,
	});
}
export function disconnectSteam() {
	return api.delete("/library/steam/disconnect");
}
export function fetchSteamPreview(page: { offset: number; limit: number }) {
	return api.post<SteamPreview>("/library/steam/preview", page);
}
