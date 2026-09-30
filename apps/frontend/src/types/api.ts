export type GameStatus =
	| "WISHLIST"
	| "BACKLOG"
	| "PLAYING"
	| "PAUSED"
	| "COMPLETED"
	| "DROPPED";

export interface HltbInfo {
	mainHours: number | null;
	mainExtraHours: number | null;
	completionistHours: number | null;
}

export type HltbStatus = "FOUND" | "MISS" | "FAILED";

export interface LibraryEntry {
	id: string;
	igdbId: number;
	name: string;
	coverUrl?: string;
	genres: string[];
	platforms: string[];
	status: GameStatus;
	userPlatform?: string;
	rating?: number;
	hoursPlayed?: number;
	notes?: string;
	completedAt?: string;
	hltbMain: number | null;
	hltbMainExtra: number | null;
	hltbCompletionist: number | null;
	hltbStatus?: HltbStatus | null;
	createdAt: string;
	updatedAt: string;
}

export interface GameSearchResult {
	igdbId: number;
	name: string;
	coverUrl?: string;
	releaseYear?: number;
	platforms: string[];
	genres: string[];
}

export interface GameDetail extends GameSearchResult {
	summary?: string;
	hltb?: HltbInfo | null;
	hltbStatus?: HltbStatus;
}

export interface LibraryStats {
	totalGames: number;
	totalHours: number;
	countByStatus: Record<GameStatus, number>;
	topGenres: { genre: string; count: number }[];
	topPlatforms: { platform: string; count: number }[];
	ratingDistribution: { rating: number; count: number }[];
	completedTimeline: { month: string; count: number }[];
}

export interface User {
	id: string;
	email: string;
	consentedAt: string | null;
	createdAt: string;
}
