import { useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookMarked, Home, Search, User } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const NAV_ITEMS = [
	{ to: "/", label: "Agora", icon: Home },
	{ to: "/library", label: "Biblioteca", icon: BookMarked },
	{ to: "/stats", label: "Estatísticas", icon: BarChart3 },
] as const;

export function BottomNav({
	libraryCount: _libraryCount,
}: {
	libraryCount?: number;
}) {
	const navigate = useNavigate();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const setSearchOpen = useAppStore((s) => s.setSearchOpen);

	const isActive = (to: string) =>
		to === "/" ? currentPath === "/" : currentPath.startsWith(to);

	return (
		<nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 h-14 flex items-center justify-around border-t border-border-soft bg-bg-1">
			{NAV_ITEMS.map(({ to, label, icon: Icon }) => {
				const active = isActive(to);
				return (
					<button
						type="button"
						key={to}
						onClick={() => navigate({ to })}
						className="flex flex-col items-center gap-1 flex-1 py-2 border-0 bg-transparent cursor-pointer"
						style={{
							color: active ? "var(--color-text-hi)" : "var(--color-text-lo)",
						}}
					>
						<Icon className="size-5" />
						<span style={{ fontSize: "var(--font-size-overline)" }}>
							{label}
						</span>
					</button>
				);
			})}
			<button
				type="button"
				onClick={() => setSearchOpen(true)}
				className="flex flex-col items-center gap-1 flex-1 py-2 border-0 bg-transparent cursor-pointer"
				style={{ color: "var(--color-text-lo)" }}
			>
				<Search className="size-5" />
				<span style={{ fontSize: "var(--font-size-overline)" }}>Buscar</span>
			</button>
			<button
				type="button"
				onClick={() => navigate({ to: "/account" })}
				className="flex flex-col items-center gap-1 flex-1 py-2 border-0 bg-transparent cursor-pointer"
				style={{
					color: currentPath.startsWith("/account")
						? "var(--color-text-hi)"
						: "var(--color-text-lo)",
				}}
			>
				<User className="size-5" />
				<span style={{ fontSize: "var(--font-size-overline)" }}>Conta</span>
			</button>
		</nav>
	);
}
