import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import {
	isDestinationActive,
	PRIMARY_DESTINATIONS,
	SECONDARY_DESTINATIONS,
} from "@/shared/lib/navigation";
import { useAppStore } from "@/store/useAppStore";
import styles from "@/styles/Shell.module.css";
import type { User } from "@/types/api";

export function Sidebar({
	me,
	libraryCount,
}: {
	me: User;
	libraryCount?: number;
}) {
	const currentPath = useRouterState().location.pathname;
	const setSearchOpen = useAppStore((state) => state.setSearchOpen);
	const logout = useLogout();

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
				{[...PRIMARY_DESTINATIONS, SECONDARY_DESTINATIONS[0]].map(
					({ to, label, icon: Icon }) => {
						const active = isDestinationActive(currentPath, to);
						return (
							<Link
								to={to}
								key={to}
								className={styles.navButton}
								data-active={active}
								aria-current={active ? "page" : undefined}
							>
								<Icon />
								<span className={styles.navLabel}>{label}</span>
								{to === "/library" && libraryCount !== undefined && (
									<span className={styles.count}>{libraryCount}</span>
								)}
							</Link>
						);
					},
				)}
			</nav>
			<div className={styles.account}>
				<p className={styles.accountEmail}>{me.email}</p>
				<div className={styles.accountActions}>
					<Button variant="ghost" size="sm" asChild>
						<Link to="/account">
							<Settings />
							<span>Configurações</span>
						</Link>
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
