import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { AccountDeleteSection } from "@/features/auth/components/AccountDeleteSection";
import { AccountExportSection } from "@/features/auth/components/AccountExportSection";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export const Route = createFileRoute("/account/data")({
	component: AccountDataPage,
});

function AccountDataPage() {
	usePageTitle("Gerenciar meus dados");
	const navigate = useNavigate();

	return (
		<div className="max-w-xl mx-auto px-6 py-12 flex flex-col gap-10">
			<div>
				<button
					type="button"
					onClick={() => navigate({ to: "/account" })}
					className="flex items-center gap-1 text-caption text-text-lo hover:text-text-md cursor-pointer bg-transparent border-0 p-0 mb-4"
				>
					<ChevronLeft className="size-3.5" />
					Configurações
				</button>
				<p className="font-mono text-overline tracking-widest uppercase text-accent-bright mb-2">
					Dados
				</p>
				<h1 className="text-2xl font-semibold tracking-tight text-text-hi">
					Gerenciar meus dados
				</h1>
				<p className="text-body text-text-lo mt-2">
					Direitos garantidos pela LGPD — portabilidade e exclusão dos seus
					dados.
				</p>
			</div>

			<AccountExportSection />

			<div className="border-t border-border-soft" />

			<AccountDeleteSection />
		</div>
	);
}
