import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Database, LogOut } from "lucide-react";
import { AccountEditSection } from "@/features/auth/components/AccountEditSection";
import { PreferencesSection } from "@/features/auth/components/PreferencesSection";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { AccountSteamSection } from "@/features/steam/components/AccountSteamSection";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import styles from "@/styles/Routes.module.css";
export const Route = createFileRoute("/account/")({ component: AccountPage });
function AccountPage() {
	usePageTitle("Configurações da Conta");
	const logout = useLogout();
	const navigate = useNavigate();
	return (
		<div className={styles.accountPage}>
			<header className={styles.accountHead}>
				<p className={styles.eyebrow}>Conta</p>
				<h1 className={styles.accountTitle}>Configurações</h1>
			</header>
			<p className={styles.eyebrow}>Preferências</p>
			<PreferencesSection />
			<p className={styles.eyebrow}>Integrações</p>
			<AccountSteamSection />
			<div className={styles.divider} />
			<AccountEditSection />
			<div className={styles.divider} />
			<div className={styles.menu}>
				<button
					type="button"
					onClick={() => navigate({ to: "/account/data" })}
					className={styles.menuButton}
				>
					<Database />
					<span>
						<strong>Gerenciar meus dados</strong>
						<small>Exportar ou excluir sua conta</small>
					</span>
					<ChevronRight />
				</button>
				<button
					type="button"
					onClick={() => logout.mutate()}
					className={styles.menuButton}
				>
					<LogOut />
					<span>
						<strong>Sair da conta</strong>
						<small>Encerra a sessão atual</small>
					</span>
					<ChevronRight />
				</button>
			</div>
			<div className={styles.links}>
				<a href="/privacy">Privacidade</a>
				<a href="/terms">Termos de Uso</a>
			</div>
		</div>
	);
}
