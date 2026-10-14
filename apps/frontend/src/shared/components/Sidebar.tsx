import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
	BarChart3,
	BookMarked,
	Home,
	LogOut,
	Search,
	Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import styles from "@/styles/Shell.module.css";
import type { User } from "@/types/api";

const NAV_ITEMS = [
	{ to: "/", label: "Agora", icon: Home },
	{ to: "/library", label: "Biblioteca", icon: BookMarked },
	{ to: "/stats", label: "Retrospecto", icon: BarChart3 },
] as const;

export function Sidebar({
	me,
	libraryCount,
}: {
	me: User;
	libraryCount?: number;
}) {
	const navigate = useNavigate();
	const currentPath = useRouterState().location.pathname;
	const setSearchOpen = useAppStore((state) => state.setSearchOpen);
	const logout = useLogout();
	const isActive = (to: string) =>
		to === "/" ? currentPath === "/" : currentPath.startsWith(to);

	return (
		<aside className={styles.sidebar}>
			<div className={`${styles.wordmark} ${styles.sidebarBrand}`}>
				<img src="/logo.svg" alt="" />
				<span>Detonado</span>
			</div>
			<button
				type="button"
				onClick={() => setSearchOpen(true)}
				className={styles.search}
			>
				<Search size={16} />
				<span>Buscar jogos</span>
				<div className={styles.shortcut}>
					<kbd>Ctrl</kbd>
					<kbd>K</kbd>
				</div>
			</button>
			<nav className={styles.nav} aria-label="Principal">
				{NAV_ITEMS.map(({ to, label, icon: Icon }) => {
					const active = isActive(to);
					return (
						<button
							type="button"
							key={to}
							onClick={() => navigate({ to })}
							className={styles.navButton}
							data-active={active}
							aria-current={active ? "page" : undefined}
						>
							<Icon />
							<span className={styles.navLabel}>{label}</span>
							{to === "/library" && libraryCount !== undefined && (
								<span className={styles.count}>{libraryCount}</span>
							)}
						</button>
					);
				})}
			</nav>
			<div className={styles.account}>
				<p className={styles.accountEmail}>{me.email}</p>
				<div className={styles.accountActions}>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => navigate({ to: "/account" })}
					>
						<Settings />
						<span>Configurações</span>
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => logout.mutate()}
						disabled={logout.isPending}
						title="Sair"
						aria-label="Sair"
					>
						<LogOut />
					</Button>
				</div>
				{logout.isError && <p role="alert">{logout.error.message}</p>}
			</div>
		</aside>
	);
}
