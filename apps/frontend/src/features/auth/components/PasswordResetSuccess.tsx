import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PasswordResetSuccess() {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col items-center gap-3 mb-2">
				<CheckCircle2 size={48} className="text-accent-bright" />
				<span className="font-mono text-overline tracking-widest uppercase text-accent-bright">
					Senha atualizada
				</span>
				<h1 className="text-2xl font-semibold tracking-tight m-0 text-text-hi text-center">
					Senha alterada com sucesso!
				</h1>
				<p className="text-body text-text-md leading-prose m-0 max-w-[36ch] text-center">
					Sua nova senha já está ativa. Use-a para acessar sua conta.
				</p>
			</div>

			<Button
				variant="accent"
				onClick={() => navigate({ to: "/login" })}
				className="w-full h-11 mt-1.5"
			>
				Fazer login
			</Button>
		</div>
	);
}
