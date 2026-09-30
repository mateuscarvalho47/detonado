import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

const PLAYING_HUE = STATUS_BY_KEY.PLAYING.hue;
const BACKLOG_HUE = STATUS_BY_KEY.BACKLOG.hue;

const EXAMPLE_PLAYING = {
	name: "Hollow Knight",
	platform: "PC",
	where: "Parei no Banco.",
};

const EXAMPLE_QUEUE = [
	{ name: "Hades", caption: "PC · 21h" },
	{ name: "Outer Wilds", caption: "PC · sem estimativa" },
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

			<main className="flex-1 flex flex-col px-5 sm:px-8 py-16">
				<div className="w-full max-w-4xl mx-auto">
					<p className="font-mono text-caption text-text-lo mb-4">
						Biblioteca pessoal de jogos
					</p>
					<h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] m-0 max-w-xl">
						Sua biblioteca de jogos.
					</h1>
					<p className="mt-5 text-body text-text-md leading-relaxed max-w-lg">
						O que você está jogando, o que zerou e o que ficou na fila, com os
						tempos do HowLongToBeat.
					</p>
					<p className="mt-3 text-body text-text-hi leading-relaxed max-w-lg">
						Não é um guia. A estante não aparece para mais ninguém.
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

					<section className="mt-14" aria-label="Exemplo da estante">
						<p className="font-mono text-caption text-text-lo mb-3">Exemplo</p>
						<div className="grid grid-cols-3 border border-border-soft bg-bg-1">
							{[
								{ label: "Jogando", value: "1" },
								{ label: "Na fila", value: "2" },
								{ label: "Horas na fila", value: "21" },
							].map((item, index) => (
								<div
									key={item.label}
									className={
										index < 2
											? "px-4 py-3 border-r border-border-soft"
											: "px-4 py-3"
									}
								>
									<div className="font-mono text-caption text-text-lo">
										{item.label}
									</div>
									<div className="mt-1 text-2xl font-semibold tabular-nums text-text-hi">
										{item.value}
									</div>
								</div>
							))}
						</div>
						<p className="m-0 mt-2 text-caption text-text-lo">
							1 jogo da fila está sem estimativa
						</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
							<div className="bg-bg-1 border border-border-soft p-5">
								<div className="text-heading font-semibold text-text-hi">
									Jogando agora
								</div>
								<div className="font-mono text-caption text-text-lo mt-0.5 mb-3.5">
									1 jogo
								</div>
								<div className="flex items-center gap-3">
									<div className="w-12 h-16 shrink-0">
										<Cover
											game={{
												name: EXAMPLE_PLAYING.name,
												platforms: [EXAMPLE_PLAYING.platform],
												cover: {
													hue: PLAYING_HUE,
													scheme: "duotone",
													glyph: EXAMPLE_PLAYING.name[0] ?? "H",
												},
											}}
											size="sm"
											withTitle={false}
										/>
									</div>
									<div className="min-w-0">
										<div className="text-body font-medium text-text-hi">
											{EXAMPLE_PLAYING.name}
										</div>
										<div className="text-caption font-mono text-text-lo mt-0.5">
											{EXAMPLE_PLAYING.platform}
										</div>
										<div className="text-caption text-text-md mt-1">
											{EXAMPLE_PLAYING.where}
										</div>
									</div>
								</div>
							</div>
							<div className="bg-bg-1 border border-border-soft p-5">
								<div className="text-heading font-semibold text-text-hi">
									Próximos na fila
								</div>
								<div className="font-mono text-caption text-text-lo mt-0.5 mb-3.5">
									2 na fila
								</div>
								<div className="flex flex-col">
									{EXAMPLE_QUEUE.map((game, index) => (
										<div
											key={game.name}
											className={`flex items-center gap-3 py-2.5${index === 0 ? " border-b border-border-soft" : ""}`}
										>
											<span className="w-8 text-caption text-text-dim">
												#{index + 1}
											</span>
											<div className="w-9 h-12 shrink-0">
												<Cover
													game={{
														name: game.name,
														platforms: ["PC"],
														cover: {
															hue: BACKLOG_HUE,
															scheme: "duotone",
															glyph: game.name[0] ?? "J",
														},
													}}
													size="xs"
													withTitle={false}
												/>
											</div>
											<div className="min-w-0">
												<div className="text-body font-medium text-text-hi">
													{game.name}
												</div>
												<div className="text-caption font-mono text-text-lo mt-0.5">
													{game.caption}
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</div>
					</section>
				</div>
			</main>

			<footer className="px-5 sm:px-8 py-6 border-t border-border-soft">
				<div className="max-w-4xl mx-auto flex flex-wrap gap-x-5 gap-y-2 text-caption text-text-lo">
					<a
						href="/privacy"
						className="text-text-md no-underline hover:underline"
					>
						Política de Privacidade
					</a>
					<a
						href="/terms"
						className="text-text-md no-underline hover:underline"
					>
						Termos
					</a>
					<a
						href="mailto:sac@carvalholabs.com.br"
						className="text-text-md no-underline hover:underline"
					>
						sac@carvalholabs.com.br
					</a>
				</div>
			</footer>
		</div>
	);
}
