import type { LibraryEntry } from "@/types/api";
import type { SuggestionValues } from "../schema/suggestionSchema";
export interface GameSuggestion {
	game: LibraryEntry;
	reasons: string[];
}
export function suggestGames(
	library: LibraryEntry[],
	filters: SuggestionValues,
	preferredPlatform?: string | null,
): GameSuggestion[] {
	const candidates = library.filter((game) => {
		if (game.status !== "BACKLOG" && game.status !== "PAUSED") return false;
		if (filters.platform && game.userPlatform !== filters.platform)
			return false;
		if (filters.genre && !game.genres.includes(filters.genre)) return false;
		return (
			filters.maxHours === "" ||
			(game.hltbMain != null && game.hltbMain <= filters.maxHours)
		);
	});
	candidates.sort((a, b) => {
		if (!filters.platform && preferredPlatform) {
			const preferred =
				Number(b.userPlatform === preferredPlatform) -
				Number(a.userPlatform === preferredPlatform);
			if (preferred) return preferred;
		}
		return (
			(a.queuePosition ?? Number.POSITIVE_INFINITY) -
				(b.queuePosition ?? Number.POSITIVE_INFINITY) ||
			a.name.localeCompare(b.name, "pt-BR") ||
			a.id.localeCompare(b.id)
		);
	});
	return candidates.slice(0, 3).map((game) => ({
		game,
		reasons: [
			game.status === "PAUSED"
				? "Uma campanha para retomar"
				: "Está na sua fila",
			...(!filters.platform &&
			preferredPlatform &&
			game.userPlatform === preferredPlatform
				? ["Na sua plataforma preferida"]
				: []),
			...(filters.platform
				? [`Plataforma registrada: ${filters.platform}`]
				: []),
			...(filters.genre ? [`Gênero: ${filters.genre}`] : []),
			game.hltbMain != null
				? `${game.hltbMain}h estimadas para a história principal`
				: "Sem estimativa de duração",
		],
	}));
}
