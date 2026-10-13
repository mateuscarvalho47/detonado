import { useNavigate, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookMarked, Home, Search, User } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import styles from "@/styles/Shell.module.css";

const NAV_ITEMS = [
	{ to: "/", label: "Agora", icon: Home },
	{ to: "/library", label: "Biblioteca", icon: BookMarked },
	{ to: "/stats", label: "Retrospecto", icon: BarChart3 },
] as const;

export function BottomNav({
	libraryCount: _libraryCount,
}: {
	libraryCount?: number;
}) {
	const navigate = useNavigate();
	const currentPath = useRouterState().location.pathname;
	const setSearchOpen = useAppStore((state) => state.setSearchOpen);
	const isActive = (to: string) =>
		to === "/" ? currentPath === "/" : currentPath.startsWith(to);
	return (
		<nav className={styles.bottomNav} aria-label="Navegação móvel">
			{NAV_ITEMS.map(({ to, label, icon: Icon }) => {
				const active = isActive(to);
				return (
					<button
						type="button"
						key={to}
						onClick={() => navigate({ to })}
						className={styles.bottomButton}
						data-active={active}
						aria-current={active ? "page" : undefined}
					>
						<Icon />
						<span>{label}</span>
					</button>
				);
			})}
			<button
				type="button"
				onClick={() => setSearchOpen(true)}
				className={styles.bottomButton}
			>
				<Search />
				<span>Buscar</span>
			</button>
			<button
				type="button"
				onClick={() => navigate({ to: "/account" })}
				className={styles.bottomButton}
				data-active={currentPath.startsWith("/account")}
			>
				<User />
				<span>Conta</span>
			</button>
		</nav>
	);
}
