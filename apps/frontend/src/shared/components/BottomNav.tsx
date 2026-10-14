import { Link, useRouterState } from "@tanstack/react-router";
import { Ellipsis, LogOut, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useVirtualKeyboard } from "@/shared/hooks/useVirtualKeyboard";
import {
	isDestinationActive,
	MORE_DESTINATIONS,
	PRIMARY_DESTINATIONS,
} from "@/shared/lib/navigation";
import { useAppStore } from "@/store/useAppStore";
import styles from "@/styles/Shell.module.css";

export function BottomNav({
	libraryCount: _libraryCount,
}: {
	libraryCount?: number;
}) {
	const path = useRouterState({ select: (state) => state.location.pathname });
	const setSearchOpen = useAppStore((state) => state.setSearchOpen);
	const logout = useLogout();
	const keyboardOpen = useVirtualKeyboard();
	const [open, setOpen] = useState(false);
	// A temporary history entry lets Android/browser Back dismiss the sheet.
	useEffect(() => {
		if (!open) return;
		window.history.pushState(
			{ ...window.history.state, detonadoMore: true },
			"",
		);
		const onBack = () => setOpen(false);
		window.addEventListener("popstate", onBack);
		return () => {
			window.removeEventListener("popstate", onBack);
			if (window.history.state?.detonadoMore) window.history.back();
		};
	}, [open]);
	useEffect(() => {
		const media = window.matchMedia("(min-width: 1024px)");
		const close = () => {
			if (media.matches) setOpen(false);
		};
		media.addEventListener("change", close);
		return () => media.removeEventListener("change", close);
	}, []);
	const primary = PRIMARY_DESTINATIONS.filter((item) => item.mobile);
	const moreActive = MORE_DESTINATIONS.some((item) =>
		isDestinationActive(path, item.to),
	);
	return (
		<nav
			className={styles.bottomNav}
			aria-label="Navegação móvel"
			data-keyboard-open={keyboardOpen}
		>
			{primary.map(({ to, label, icon: Icon }, index) => (
				<div key={to} className={styles.bottomSlot}>
					{index === 2 && (
						<button
							type="button"
							className={styles.bottomButton}
							onClick={() => setSearchOpen(true)}
						>
							<Search />
							<span>Buscar</span>
						</button>
					)}
					<Link
						to={to}
						className={styles.bottomButton}
						data-active={isDestinationActive(path, to)}
						aria-current={isDestinationActive(path, to) ? "page" : undefined}
					>
						<Icon />
						<span>{label}</span>
					</Link>
				</div>
			))}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<button
						type="button"
						className={styles.bottomButton}
						data-active={moreActive}
						data-open={open}
					>
						<Ellipsis />
						<span>Mais</span>
					</button>
				</DialogTrigger>
				<DialogContent className={styles.moreSheet}>
					<DialogTitle>Mais</DialogTitle>
					<DialogDescription>
						Organização, importações e configurações.
					</DialogDescription>
					<nav aria-label="Mais destinos">
						{MORE_DESTINATIONS.map(({ to, label, icon: Icon }) => (
							<DialogClose asChild key={to}>
								<Link
									to={to}
									onClick={() =>
										window.history.replaceState(
											{ ...window.history.state, detonadoMore: false },
											"",
										)
									}
									replace
									className={styles.navButton}
									data-active={isDestinationActive(path, to)}
									aria-current={
										isDestinationActive(path, to) ? "page" : undefined
									}
								>
									<Icon />
									<span>{label}</span>
								</Link>
							</DialogClose>
						))}
					</nav>
					<Button
						variant="ghost"
						disabled={logout.isPending}
						onClick={() =>
							logout.mutate(undefined, {
								onSuccess: (done) => {
									if (done) setOpen(false);
								},
							})
						}
					>
						<LogOut />
						Sair
					</Button>
					{logout.isError && <p role="alert">{logout.error.message}</p>}
				</DialogContent>
			</Dialog>
		</nav>
	);
}
