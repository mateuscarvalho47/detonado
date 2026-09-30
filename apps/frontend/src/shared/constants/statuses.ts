import type { GameStatus } from "@/types/api";

export interface StatusDef {
	key: GameStatus;
	label: string;
	hue: number;
	color: string;
	bgColor: string;
	borderColor: string;
	colorLight: string;
	bgColorLight: string;
	borderColorLight: string;
}

export const STATUSES: StatusDef[] = [
	{
		key: "WISHLIST",
		label: "Quero jogar",
		hue: 85,
		color: "oklch(0.78 0.07 85)",
		bgColor: "oklch(0.18 0.1 75 / 0.72)",
		borderColor: "oklch(0.5 0.15 75 / 0.5)",
		colorLight: "oklch(0.12 0.04 75)",
		bgColorLight: "oklch(0.88 0.14 75)",
		borderColorLight: "oklch(0.55 0.12 75 / 0.5)",
	},
	{
		key: "BACKLOG",
		label: "Fila",
		hue: 255,
		color: "oklch(0.75 0.05 255)",
		bgColor: "oklch(0.18 0.1 260 / 0.72)",
		borderColor: "oklch(0.5 0.15 260 / 0.5)",
		colorLight: "oklch(0.12 0.04 260)",
		bgColorLight: "oklch(0.88 0.14 260)",
		borderColorLight: "oklch(0.55 0.12 260 / 0.5)",
	},
	{
		key: "PLAYING",
		label: "Jogando",
		hue: 150,
		color: "oklch(0.78 0.08 150)",
		bgColor: "oklch(0.18 0.1 195 / 0.72)",
		borderColor: "oklch(0.5 0.15 195 / 0.5)",
		colorLight: "oklch(0.12 0.04 195)",
		bgColorLight: "oklch(0.88 0.14 195)",
		borderColorLight: "oklch(0.55 0.12 195 / 0.5)",
	},
	{
		key: "PAUSED",
		label: "Pausado",
		hue: 65,
		color: "oklch(0.8 0.08 65)",
		bgColor: "oklch(0.18 0.1 200 / 0.72)",
		borderColor: "oklch(0.5 0.15 200 / 0.5)",
		colorLight: "oklch(0.12 0.04 200)",
		bgColorLight: "oklch(0.88 0.14 200)",
		borderColorLight: "oklch(0.55 0.12 200 / 0.5)",
	},
	{
		key: "COMPLETED",
		label: "Zerado",
		hue: 200,
		color: "oklch(0.78 0.04 200)",
		bgColor: "oklch(0.18 0.1 145 / 0.72)",
		borderColor: "oklch(0.5 0.15 145 / 0.5)",
		colorLight: "oklch(0.12 0.04 145)",
		bgColorLight: "oklch(0.88 0.14 145)",
		borderColorLight: "oklch(0.55 0.12 145 / 0.5)",
	},
	{
		key: "DROPPED",
		label: "Abandonado",
		hue: 25,
		color: "oklch(0.75 0.08 25)",
		bgColor: "oklch(0.18 0.1 25 / 0.72)",
		borderColor: "oklch(0.5 0.15 25 / 0.5)",
		colorLight: "oklch(0.12 0.04 25)",
		bgColorLight: "oklch(0.88 0.14 25)",
		borderColorLight: "oklch(0.55 0.12 25 / 0.5)",
	},
];

export const STATUS_BY_KEY = Object.fromEntries(
	STATUSES.map((s) => [s.key, s]),
) as Record<GameStatus, StatusDef>;
