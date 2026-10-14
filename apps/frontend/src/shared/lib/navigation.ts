import {
	BarChart3,
	BookMarked,
	FileText,
	Folder,
	Home,
	Import,
	Settings,
	Shield,
} from "lucide-react";

export const PRIMARY_DESTINATIONS = [
	{ to: "/", label: "Agora", icon: Home, mobile: true },
	{ to: "/library", label: "Biblioteca", icon: BookMarked, mobile: true },
	{ to: "/collections", label: "Coleções", icon: Folder, mobile: false },
	{ to: "/stats", label: "Retrospecto", icon: BarChart3, mobile: true },
] as const;
export const SECONDARY_DESTINATIONS = [
	{ to: "/imports", label: "Importar jogos", icon: Import },
	{ to: "/account", label: "Configurações", icon: Settings },
	{ to: "/privacy", label: "Privacidade", icon: Shield },
	{ to: "/terms", label: "Termos de Uso", icon: FileText },
] as const;
export const MORE_DESTINATIONS = [
	...PRIMARY_DESTINATIONS.filter((item) => !item.mobile),
	...SECONDARY_DESTINATIONS,
];
export function isDestinationActive(path: string, to: string) {
	return to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);
}
export function pageTitle(path: string) {
	if (path.startsWith("/library/")) return "Ficha do jogo";
	if (path === "/account/data") return "Gerenciar meus dados";
	if (path === "/onboarding") return "Personalizar biblioteca";
	return (
		[...PRIMARY_DESTINATIONS, ...SECONDARY_DESTINATIONS].find((item) =>
			isDestinationActive(path, item.to),
		)?.label ?? "Detonado"
	);
}
