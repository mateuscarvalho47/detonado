import type { GameStatus } from "@/types/api";

export interface StatusDef {
	key: GameStatus;
	label: string;
	hue: number;
	color: string;
}

export const STATUSES: StatusDef[] = [
	{
		key: "WISHLIST",
		label: "Quero jogar",
		hue: 305,
		color: "var(--color-status-wishlist)",
	},
	{
		key: "BACKLOG",
		label: "Fila",
		hue: 260,
		color: "var(--color-status-backlog)",
	},
	{
		key: "PLAYING",
		label: "Jogando",
		hue: 175,
		color: "var(--color-status-playing)",
	},
	{
		key: "PAUSED",
		label: "Pausado",
		hue: 85,
		color: "var(--color-status-paused)",
	},
	{
		key: "COMPLETED",
		label: "Zerado",
		hue: 140,
		color: "var(--color-status-completed)",
	},
	{
		key: "DROPPED",
		label: "Abandonado",
		hue: 25,
		color: "var(--color-status-dropped)",
	},
];

export const STATUS_BY_KEY = Object.fromEntries(
	STATUSES.map((s) => [s.key, s]),
) as Record<GameStatus, StatusDef>;
