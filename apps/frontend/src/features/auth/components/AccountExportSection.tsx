import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportData } from "../hooks/useAuth";
import styles from "./Auth.module.css";
export function AccountExportSection() {
	const mutation = useExportData();
	function exportData() {
		mutation.mutate(undefined, {
			onSuccess: (data) => {
				const url = URL.createObjectURL(
					new Blob([JSON.stringify(data, null, 2)], {
						type: "application/json",
					}),
				);
				const anchor = document.createElement("a");
				anchor.href = url;
				anchor.download = "detonado-dados.json";
				anchor.click();
				URL.revokeObjectURL(url);
			},
		});
	}
	return (
		<section className={styles.accountSection}>
			<h2>
				<Download />
				Exportar meus dados
			</h2>
			<p>
				Baixe perfil e biblioteca completa em JSON. É o seu direito de
				portabilidade pela LGPD.
			</p>
			<div>
				<Button
					variant="outline"
					onClick={exportData}
					disabled={mutation.isPending}
				>
					<Download />
					{mutation.isPending ? "Preparando…" : "Baixar dados (.json)"}
				</Button>
			</div>
			{mutation.error && (
				<p className={styles.error}>{mutation.error.message}</p>
			)}
		</section>
	);
}
