import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVerifyEmail } from "../hooks/useAuth";

const VERIFIED_KEY = "detonado_email_verified";

export function VerifyEmailScreen() {
	const search = useSearch({ strict: false });
	const token = (search as Record<string, string>).token ?? "";
	const navigate = useNavigate();
	const [alreadyVerified] = useState(
		() => localStorage.getItem(VERIFIED_KEY) === "true",
	);
	const verify = useVerifyEmail(token, !alreadyVerified);

	useEffect(() => {
		if (verify.isSuccess) {
			localStorage.setItem(VERIFIED_KEY, "true");
		}
	}, [verify.isSuccess]);

	return (
		<div className="relative min-h-screen flex items-center justify-center px-5 py-10 bg-bg-0 overflow-hidden">
			{/* Grid background */}
			<div
				className="absolute inset-0 pointer-events-none opacity-40"
				style={{
					backgroundImage: `
            linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px),
            linear-gradient(0deg,  var(--color-grid-line) 1px, transparent 1px)
          `,
					backgroundSize: "48px 48px",
					maskImage:
						"radial-gradient(ellipse at center, black 30%, transparent 75%)",
				}}
			/>

			{/* Glow */}
			<div
				className="absolute pointer-events-none"
				style={{
					top: "50%",
					left: "50%",
					width: "80vw",
					height: "80vw",
					transform: "translate(-50%, -50%)",
					background:
						"radial-gradient(circle, var(--color-glow-accent) 0%, transparent 50%)",
				}}
			/>

			{/* Card */}
			<div className="relative z-10 w-full max-w-105 rounded-xl border border-border p-8 backdrop-blur-xl bg-bg-1/85 shadow-panel">
				{/* Brand */}
				<div className="flex items-center gap-2.5 mb-7">
					<img
						src="/logo.svg"
						alt="Detonado"
						width="22"
						height="22"
						className="rounded-md"
					/>
					<span className="text-title font-bold tracking-[-0.02em] text-text-hi">
						Detonado
					</span>
				</div>

				{verify.isLoading && (
					<div className="flex flex-col gap-3">
						<span className="font-mono text-overline tracking-widest uppercase text-accent-bright block">
							Verificando
						</span>
						<h1 className="text-2xl font-semibold tracking-tight text-text-hi m-0">
							Confirmando email...
						</h1>
						<p className="text-body text-text-md leading-prose m-0">
							Aguarde um momento.
						</p>
					</div>
				)}

				{(verify.isSuccess || alreadyVerified) && (
					<div className="flex flex-col gap-5">
						<div className="flex flex-col gap-2">
							<div className="flex items-center gap-2 mb-1">
								<svg
									aria-hidden="true"
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									className="text-accent-bright shrink-0"
								>
									<circle
										cx="8"
										cy="8"
										r="7"
										stroke="currentColor"
										strokeWidth="1.5"
									/>
									<path
										d="M5 8l2 2 4-4"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<span className="font-mono text-overline tracking-widest uppercase text-accent-bright">
									Email confirmado
								</span>
							</div>
							<h1 className="text-2xl font-semibold tracking-tight text-text-hi m-0">
								Tudo certo!
							</h1>
							<p className="text-body text-text-md leading-prose m-0 max-w-[38ch]">
								Seu email foi verificado com sucesso. Sua conta está ativa e
								pronta para uso.
							</p>
						</div>

						<div className="rounded-lg border border-accent-bright/20 bg-accent-bright/5 px-4 py-3">
							<p className="text-caption text-accent-bright font-medium m-0 leading-normal">
								Você já pode entrar na sua conta com o email e senha
								cadastrados.
							</p>
						</div>

						<Button
							variant="accent"
							className="w-full h-11 rounded-lg"
							onClick={() => {
								localStorage.removeItem(VERIFIED_KEY);
								navigate({ to: "/login" });
							}}
						>
							Entrar na conta
						</Button>
					</div>
				)}

				{verify.isError && !alreadyVerified && (
					<div className="flex flex-col gap-4">
						<div>
							<span className="font-mono text-overline tracking-widest uppercase text-error block mb-2">
								Erro
							</span>
							<h1 className="text-2xl font-semibold tracking-tight text-text-hi m-0 mb-2">
								Link inválido
							</h1>
							<p className="text-body text-text-md leading-prose m-0 max-w-[36ch]">
								{(verify.error as Error)?.message ??
									"Token de verificação inválido ou expirado."}
							</p>
						</div>
						<Button
							variant="outline"
							className="w-full h-11 rounded-lg mt-1"
							onClick={() => navigate({ to: "/register" })}
						>
							Criar nova conta
						</Button>
					</div>
				)}

				{!token && !verify.isLoading && !alreadyVerified && (
					<div className="flex flex-col gap-4">
						<div>
							<span className="font-mono text-overline tracking-widest uppercase text-error block mb-2">
								Erro
							</span>
							<h1 className="text-2xl font-semibold tracking-tight text-text-hi m-0 mb-2">
								Token ausente
							</h1>
							<p className="text-body text-text-md leading-prose m-0 max-w-[36ch]">
								Use o link enviado para o seu email.
							</p>
						</div>
						<Button
							variant="outline"
							className="w-full h-11 rounded-lg mt-1"
							onClick={() => navigate({ to: "/login" })}
						>
							Voltar ao login
						</Button>
					</div>
				)}

				<div className="mt-5 pt-4 border-t border-border-soft font-mono text-overline text-text-dim text-center tracking-[0.04em]">
					DETONADO · RASTREADOR DE JOGOS
				</div>
			</div>
		</div>
	);
}
