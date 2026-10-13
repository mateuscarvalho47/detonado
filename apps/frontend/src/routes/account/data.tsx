import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AccountDeleteSection } from "@/features/auth/components/AccountDeleteSection";
import { AccountExportSection } from "@/features/auth/components/AccountExportSection";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import styles from "@/styles/Routes.module.css";
export const Route = createFileRoute("/account/data")({
	component: AccountDataPage,
});
function AccountDataPage() {
	usePageTitle("Gerenciar meus dados");
	const navigate = useNavigate();
	return (
		<div className={styles.accountPage}>
			<button
				type="button"
				onClick={() => navigate({ to: "/account" })}
				className={styles.back}
			>
				<ChevronLeft />
				Configurações
			</button>
			<header className={styles.accountHead}>
				<p className={styles.eyebrow}>Dados</p>
				<h1 className={styles.accountTitle}>Gerenciar meus dados</h1>
				<p className={styles.accountIntro}>
					Portabilidade e exclusão garantidas pela LGPD.
				</p>
			</header>
			<AccountExportSection />
			<div className={styles.divider} />
			<AccountDeleteSection />
		</div>
	);
}
