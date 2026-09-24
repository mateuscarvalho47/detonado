import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportData } from "../hooks/useAuth";

export function AccountExportSection() {
	const exportMutation = useExportData();

	function handleExport() {
		exportMutation.mutate(undefined, {
			onSuccess: (data) => {
				const blob = new Blob([JSON.stringify(data, null, 2)], {
					type: "application/json",
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "detonado-dados.json";
				a.click();
				URL.revokeObjectURL(url);
			},
		});
	}

	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-body font-semibold text-text-hi flex items-center gap-2">
				<Download size={14} className="text-accent-bright" />
				Exportar meus dados
			</h2>
			<p className="text-caption text-text-lo">
				Baixe um arquivo JSON com todos os seus dados — perfil e biblioteca
				completa. Seu direito de portabilidade pela LGPD (Art. 19).
			</p>
			<Button
				variant="outline"
				onClick={handleExport}
				disabled={exportMutation.isPending}
				className="w-fit h-9 rounded-lg text-caption"
			>
				<Download size={12} />
				{exportMutation.isPending ? "Preparando..." : "Baixar dados (.json)"}
			</Button>
			{exportMutation.error && (
				<p className="text-body m-0 text-error">
					{exportMutation.error.message}
				</p>
			)}
		</section>
	);
}
