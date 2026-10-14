import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { CsvImportPanel } from "@/features/import/components/CsvImportPanel";
import styles from "@/features/library/components/Library.module.css";
import { SteamImportPanel } from "@/features/steam/components/SteamImportPanel";
export const Route = createFileRoute("/imports")({ component: ImportsPage });
function ImportsPage() {
	return (
		<div className={styles.page}>
			<PageHeader
				overline="Sua biblioteca"
				title="Importar jogos"
				subtitle="Revise os jogos e confirme o que entra na sua biblioteca."
			/>
			<p>
				<Link to="/account">Gerenciar conexão Steam</Link>
			</p>
			<SteamImportPanel />
			<CsvImportPanel />
		</div>
	);
}
