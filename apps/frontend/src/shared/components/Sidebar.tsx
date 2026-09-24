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
import { Separator } from "@/components/ui/separator";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types/api";

const NAV_ITEMS = [
	{ to: "/", label: "Home", icon: Home },
	{ to: "/library", label: "Biblioteca", icon: BookMarked },
	{ to: "/stats", label: "Estatísticas", icon: BarChart3 },
] as const;

export function Sidebar({
	me,
	libraryCount,
}: {
	me: User;
	libraryCount?: number;
}) {
	const navigate = useNavigate();
	const routerState = useRouterState();
	const currentPath = routerState.location.pathname;
	const setSearchOpen = useAppStore((s) => s.setSearchOpen);
	const logout = useLogout();

	const isActive = (to: string) =>
		to === "/" ? currentPath === "/" : currentPath.startsWith(to);

	return (
		<aside
			className="sticky top-0 self-start h-screen flex flex-col gap-3 p-[18px_14px] w-full"
			style={{
				background: "var(--color-bg-1)",
				borderRight: "1px solid var(--color-border-soft)",
			}}
		>
			{/* Brand */}
			<div className="flex items-center gap-2 px-1.5 pb-1">
				<img
					src="/logo.svg"
					alt=""
					width="22"
					height="22"
					className="rounded-md"
				/>
				<span className="text-heading font-bold tracking-[-0.02em] text-text-hi">
					Detonado
				</span>
			</div>

			{/* Search button */}
			<button
				type="button"
				onClick={() => setSearchOpen(true)}
				className="flex items-center gap-2 rounded-md px-2.5 py-2 text-caption transition-all cursor-pointer w-full bg-bg-2 border border-border-soft text-text-md"
			>
				<Search className="size-3.5" />
				<span className="flex-1 text-left text-body">Buscar jogos</span>
				<div className="flex gap-0.5">
					{["Ctrl", "K"].map((k) => (
						<kbd
							key={k}
							className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-overline font-medium font-mono text-text-md bg-bg-3 border border-border"
							style={{ boxShadow: "0 1px 0 oklch(0 0 0 / 0.5)" }}
						>
							{k}
						</kbd>
					))}
				</div>
			</button>

			{/* Nav */}
			<nav className="flex flex-col gap-px pt-1">
				{NAV_ITEMS.map(({ to, label, icon: Icon }) => {
					const active = isActive(to);
					return (
						<button
							type="button"
							key={to}
							onClick={() => navigate({ to })}
							className={cn(
								"flex items-center gap-2.5 px-2.5 py-2 rounded-sm",
								"text-body font-medium text-left w-full cursor-pointer transition-[background,color]",
								"border-0",
							)}
							style={{
								background: active ? "var(--color-accent-soft)" : "transparent",
								color: active
									? "var(--color-accent-bright)"
									: "var(--color-text-md)",
							}}
						>
							<span className="flex opacity-85">
								<Icon className="size-4" />
							</span>
							<span className="flex-1">{label}</span>
							{to === "/library" && libraryCount !== undefined && (
								<span
									className="text-overline px-1.5 py-px rounded font-mono"
									style={{
										color: active
											? "var(--color-accent-bright)"
											: "var(--color-text-lo)",
										background: active
											? "var(--color-accent-soft)"
											: "var(--color-bg-3)",
									}}
								>
									{libraryCount}
								</span>
							)}
						</button>
					);
				})}
			</nav>

			<Separator className="bg-border-soft" />

			{/* Footer user */}
			<div className="mt-auto flex flex-col gap-2">
				<div className="flex flex-col gap-2.5 p-3 rounded-md bg-bg-2 border border-border-soft">
					<div className="flex items-center gap-2.5">
						<div className="flex-1 min-w-0">
							<div className="text-body font-semibold text-text-hi leading-tight">
								Minha conta
							</div>
							<div className="text-caption truncate font-mono text-text-lo mt-0.5">
								{me?.email ?? "—"}
							</div>
						</div>
					</div>
					<div className="flex gap-1.5">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: "/account" })}
							title="Configurações"
							className="flex-1 h-7 text-text-md gap-1.5 justify-start px-1"
						>
							<Settings className="size-3.5" />
							<span className="text-overline">Configurações</span>
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => logout.mutate()}
							title="Sair"
							className="shrink-0 h-7 w-7 text-text-md"
						>
							<LogOut className="size-3.5" />
						</Button>
					</div>
				</div>
			</div>
		</aside>
	);
}
