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
		hue: 85,
		color: "oklch(0.78 0.07 85)",
	},
	{
		key: "BACKLOG",
		label: "Fila",
		hue: 255,
		color: "oklch(0.75 0.05 255)",
	},
	{
		key: "PLAYING",
		label: "Jogando",
		hue: 150,
		color: "oklch(0.78 0.08 150)",
	},
	{
		key: "PAUSED",
		label: "Pausado",
		hue: 65,
		color: "oklch(0.8 0.08 65)",
	},
	{
		key: "COMPLETED",
		label: "Zerado",
		hue: 200,
		color: "oklch(0.78 0.04 200)",
	},
	{
		key: "DROPPED",
		label: "Abandonado",
		hue: 25,
		color: "oklch(0.75 0.08 25)",
	},
];

export const STATUS_BY_KEY = Object.fromEntries(
	STATUSES.map((s) => [s.key, s]),
) as Record<GameStatus, StatusDef>;
