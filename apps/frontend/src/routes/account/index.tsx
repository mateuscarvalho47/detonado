import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Database, LogOut } from "lucide-react";
import { AccountEditSection } from "@/features/auth/components/AccountEditSection";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

export const Route = createFileRoute("/account/")({
	component: AccountPage,
});

function AccountPage() {
	usePageTitle("Configurações da Conta");
	const logout = useLogout();
	const navigate = useNavigate();

	return (
		<div className="max-w-xl mx-auto px-6 py-12 flex flex-col gap-10">
			<div>
				<p className="font-mono text-overline tracking-widest uppercase text-accent-bright mb-2">
					Conta
				</p>
				<h1 className="text-2xl font-semibold tracking-tight text-text-hi">
					Configurações
				</h1>
			</div>

			<AccountEditSection />

			<div className="border-t border-border-soft" />

			{/* Preferências */}
			<div className="flex flex-col gap-1">
				<p className="font-mono text-overline tracking-widest uppercase text-text-lo mb-2">
					Preferências
				</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/account/data" })}
					className="flex items-center gap-3 px-3 py-3 rounded-lg bg-bg-1 border border-border-soft cursor-pointer text-left"
				>
					<Database className="size-4 text-text-md shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="text-body font-medium text-text-hi">Gerenciar meus dados</div>
						<div className="text-caption text-text-lo">Exportar ou excluir sua conta</div>
					</div>
					<ChevronRight className="size-4 text-text-dim shrink-0" />
				</button>
				<button
					type="button"
					onClick={() => logout.mutate()}
					className="flex items-center gap-3 px-3 py-3 rounded-lg bg-bg-1 border border-border-soft cursor-pointer text-left"
				>
					<LogOut className="size-4 text-error shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="text-body font-medium text-error">Sair da conta</div>
						<div className="text-caption text-text-lo">Encerra a sessão atual</div>
					</div>
				</button>
			</div>

			<div className="pt-2 border-t border-border-soft flex gap-4 text-caption text-text-lo">
				<a
					href="/privacy"
					className="text-accent-bright no-underline hover:underline"
				>
					Política de Privacidade
				</a>
				<a
					href="/terms"
					className="text-accent-bright no-underline hover:underline"
				>
					Termos de Uso
				</a>
			</div>
		</div>
	);
}
