import type { ImportRow } from "@/features/import/service/importService";
import type { GameSearchResult } from "@/types/api";
import type { SteamGame } from "../service/steamService";
export function steamImportRows(
	games: SteamGame[],
	overrides: Record<number, GameSearchResult>,
) {
	return games.map((game): ImportRow => {
		const match = overrides[game.appId] ?? game.match;
		const userPlatform =
			match && game.userPlatform && match.platforms.includes(game.userPlatform)
				? game.userPlatform
				: match?.platforms.find(
						(platform) => platform === "PC (Microsoft Windows)",
					);
		return {
			...(match ? { igdbId: match.igdbId } : {}),
			name: match?.name ?? game.name,
			hoursPlayed: game.hoursPlayed,
			...(userPlatform ? { userPlatform } : {}),
			duplicateAction: "SKIP",
		};
	});
}
