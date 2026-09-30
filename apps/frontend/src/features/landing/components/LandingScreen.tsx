import { useNavigate } from "@tanstack/react-router";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const FACTS = [
	{
		label: "Status",
		value: "Jogando, fila, zerado, pausado, abandonado, quero jogar",
	},
	{ label: "Ficha", value: "Plataforma, nota de 0 a 10, horas e anotações" },
	{ label: "Fila", value: "Soma do tempo principal do HowLongToBeat" },
];

export function LandingScreen() {
	usePageTitle("Biblioteca pessoal de jogos");
	const navigate = useNavigate();

	return (
		<div className="min-h-screen flex flex-col bg-bg-0 text-text-hi">
			<header className="flex items-center justify-between px-5 sm:px-8 h-14 border-b border-border-soft">
				<div className="flex items-center gap-2.5">
					<img src="/logo.svg" alt="" width="22" height="22" />
					<span className="text-heading font-semibold tracking-tight">
						Detonado
					</span>
				</div>
				<button
					type="button"
					onClick={() => navigate({ to: "/login" })}
					className="h-9 px-3 text-body text-text-md bg-transparent border-0 cursor-pointer"
				>
					Entrar
				</button>
			</header>

			<main className="flex-1 flex flex-col justify-center px-5 sm:px-8 py-16">
				<div className="w-full max-w-xl">
					<p className="font-mono text-caption text-text-lo mb-4">
						Biblioteca pessoal de jogos
					</p>
					<h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] m-0">
						Sua biblioteca de jogos.
					</h1>
					<p className="mt-5 text-body text-text-md leading-relaxed max-w-lg">
						O que você está jogando, o que zerou e o que ficou na fila, com os
						tempos do HowLongToBeat.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 mt-8">
						<button
							type="button"
							onClick={() => navigate({ to: "/register" })}
							className="btn-accent h-11 px-6 text-heading cursor-pointer"
						>
							Criar conta
						</button>
						<button
							type="button"
							onClick={() => navigate({ to: "/login" })}
							className="h-11 px-6 text-heading text-text-md bg-transparent border border-border-strong cursor-pointer"
						>
							Já tenho conta
						</button>
					</div>

					<dl className="mt-14 border-t border-border-soft">
						{FACTS.map((fact) => (
							<div
								key={fact.label}
								className="grid grid-cols-1 sm:grid-cols-[7rem_1fr] gap-1 sm:gap-6 py-3.5 border-b border-border-soft"
							>
								<dt className="font-mono text-caption text-text-lo">
									{fact.label}
								</dt>
								<dd className="m-0 text-body text-text-hi">{fact.value}</dd>
							</div>
						))}
					</dl>
				</div>
			</main>
		</div>
	);
}
