import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Menu } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConsentModal } from "@/features/auth/components/ConsentModal";
import { useMe } from "@/features/auth/hooks/useAuth";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { OfflineBanner } from "@/features/offline/components/OfflineBanner";
import { SearchModal } from "@/features/search/components/SearchModal";
import { BottomNav } from "@/shared/components/BottomNav";
import { DraftBoundary } from "@/shared/components/DraftBoundary";
import { Sidebar } from "@/shared/components/Sidebar";
import { pageTitle } from "@/shared/lib/navigation";
import { useAppStore } from "@/store/useAppStore";
import styles from "@/styles/Shell.module.css";

function useApplyTheme() {
	useEffect(() => {
		document.documentElement.setAttribute("data-theme", "dark");
		document.documentElement.classList.add("dark");
	}, []);
}

const PUBLIC_ROUTES = [
	"/",
	"/login",
	"/register",
	"/verify-email",
	"/forgot-password",
	"/reset-password",
	"/reset-success",
	"/privacy",
	"/terms",
];
const NO_SHELL_ROUTES = [
	"/login",
	"/register",
	"/verify-email",
	"/forgot-password",
	"/reset-password",
	"/reset-success",
	"/privacy",
	"/terms",
];

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	useApplyTheme();
	const { searchOpen, setSearchOpen, sidebarOpen, toggleSidebar } =
		useAppStore();
	const navigate = useNavigate();
	const location = useLocation();
	const isAuthRoute = ["/login", "/register"].includes(location.pathname);
	const {
		data: me,
		isFetching,
		isError,
		refetch,
	} = useMe({ enabled: !isAuthRoute });
	const { data: library = [] } = useLibrary({ enabled: !!me });

	useEffect(() => {
		if (me === null && !PUBLIC_ROUTES.includes(location.pathname))
			navigate({ to: "/" });
	}, [me, location.pathname, navigate]);

	useEffect(() => {
		if (me?.onboardingCompletedAt === null && location.pathname === "/")
			void navigate({ to: "/onboarding", replace: true });
	}, [me?.onboardingCompletedAt, location.pathname, navigate]);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [setSearchOpen]);

	const needsSession =
		location.pathname === "/" || !PUBLIC_ROUTES.includes(location.pathname);

	if (needsSession && me === undefined) {
		return (
			<div className={styles.loading}>
				<div role="status" aria-live="polite">
					{isError && !isFetching ? (
						<>
							<p>Não foi possível verificar sua sessão. Tente novamente.</p>
							<Button onClick={() => void refetch()}>Tentar novamente</Button>
						</>
					) : (
						<p>Conectando… aguardando o serviço ficar disponível.</p>
					)}
				</div>
			</div>
		);
	}

	if (me === null && !PUBLIC_ROUTES.includes(location.pathname)) {
		return <div className={styles.loading}>organizando sua biblioteca…</div>;
	}

	const hasShell = me && !NO_SHELL_ROUTES.includes(location.pathname);

	return (
		<div>
			{hasShell ? (
				<div className={styles.shell}>
					<div className={styles.sidebarFrame} data-open={sidebarOpen}>
						<Sidebar me={me} libraryCount={library.length} />
					</div>
					<main className={styles.main}>
						<div className={styles.mobileBar}>
							{location.pathname.startsWith("/library/") && (
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Voltar à biblioteca"
									onClick={() =>
										void navigate({ to: "/library", search: true })
									}
								>
									<ArrowLeft />
								</Button>
							)}
							<strong>{pageTitle(location.pathname)}</strong>
						</div>
						<div className={styles.desktopBar}>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={toggleSidebar}
								aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
							>
								<Menu />
							</Button>
							{!sidebarOpen && (
								<div className={styles.wordmark}>
									<img src="/logo.svg" alt="" />
									<span>Detonado</span>
								</div>
							)}
						</div>
						<div className={styles.content}>
							<OfflineBanner authenticated />
							<DraftBoundary key={me.id}>
								<Outlet />
							</DraftBoundary>
						</div>
					</main>
					<BottomNav libraryCount={library.length} />
				</div>
			) : (
				<>
					<OfflineBanner authenticated={false} />
					<Outlet />
				</>
			)}
			{hasShell && (
				<SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
			)}
			{hasShell && me.consentedAt === null && <ConsentModal />}
		</div>
	);
}
