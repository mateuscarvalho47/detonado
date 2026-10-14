import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Clock3, EyeOff, ListOrdered, MapPin } from "lucide-react";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import styles from "./LandingScreen.module.css";

const GAMES = [
	{
		name: "Hollow Knight",
		status: "Jogando",
		detail: "Parei no Banco.",
		coverUrl:
			"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/library_600x900_2x.jpg",
	},
	{
		name: "Hades",
		status: "Próximo da fila",
		detail: "Principal · 21h",
		coverUrl:
			"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/library_600x900_2x.jpg",
	},
	{
		name: "Outer Wilds",
		status: "Na fila",
		detail: "Sem estimativa",
		coverUrl:
			"https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/753640/library_600x900_2x.jpg",
	},
];

export function LandingScreen() {
	usePageTitle("Lembre onde parou — Detonado");
	const navigate = useNavigate();
	return (
		<div className={styles.page}>
			<header className={styles.nav}>
				<a href="/" className={styles.brand} aria-label="Detonado, início">
					<img src="/logo.svg" alt="" />
					Detonado
				</a>
				<button
					type="button"
					className={styles.login}
					onClick={() => navigate({ to: "/login" })}
				>
					Entrar
				</button>
			</header>

			<main>
				<section className={styles.hero}>
					<div className={styles.heroCopy}>
						<p className={styles.eyebrow}>
							Sua memória entre uma sessão e outra
						</p>
						<h1>
							Lembre onde parou.
							<br />
							<em>Escolha o próximo.</em>
						</h1>
						<p className={styles.lead}>
							Organize o que está jogando, guarde aquela anotação importante e
							veja quanto tempo cabe na sua próxima aventura.
						</p>
						<div className={styles.actions}>
							<button
								type="button"
								className={styles.primary}
								onClick={() => navigate({ to: "/register" })}
							>
								Montar minha biblioteca <ArrowRight />
							</button>
							<button
								type="button"
								className={styles.secondary}
								onClick={() =>
									document
										.getElementById("como-funciona")
										?.scrollIntoView({ behavior: "smooth" })
								}
							>
								Ver como funciona
							</button>
						</div>
						<p className={styles.trigger}>
							Conta gratuita · leva menos de um minuto
						</p>
					</div>

					<div
						className={styles.productProof}
						role="img"
						aria-label="Prévia de uma biblioteca no Detonado"
					>
						<div className={styles.proofTop}>
							<span>Jogando agora</span>
							<span className={styles.live}>1 em andamento</span>
						</div>
						<div className={styles.featuredGame}>
							<div className={styles.featuredCover}>
								<Cover
									game={{
										name: GAMES[0].name,
										coverUrl: GAMES[0].coverUrl,
										cover: {
											hue: STATUS_BY_KEY.PLAYING.hue,
											scheme: "duotone",
											glyph: "H",
										},
									}}
									size="lg"
									withTitle={false}
								/>
							</div>
							<div>
								<span className={styles.gameStatus}>Jogando</span>
								<h2>{GAMES[0].name}</h2>
								<p className={styles.note}>
									<MapPin /> {GAMES[0].detail}
								</p>
								<p className={styles.meta}>PC · 24h jogadas</p>
							</div>
						</div>
						<div className={styles.queue}>
							{GAMES.slice(1).map((game, index) => (
								<div className={styles.queueItem} key={game.name}>
									<span className={styles.position}>0{index + 1}</span>
									<div className={styles.miniCover}>
										<Cover
											game={{
												name: game.name,
												coverUrl: game.coverUrl,
												cover: {
													hue: STATUS_BY_KEY.BACKLOG.hue,
													scheme: "duotone",
													glyph: game.name[0],
												},
											}}
											size="xs"
											withTitle={false}
										/>
									</div>
									<div>
										<strong>{game.name}</strong>
										<span>{game.detail}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				<section id="como-funciona" className={styles.valueSection}>
					<div className={styles.sectionIntro}>
						<p className={styles.eyebrow}>
							Menos backlog abstrato. Mais contexto.
						</p>
						<h2>Abra o jogo sabendo exatamente o que fazer.</h2>
					</div>
					<div className={styles.values}>
						<article>
							<MapPin />
							<span>01</span>
							<h3>Continue de onde parou</h3>
							<p>
								Guarde o lugar, a missão ou a ideia que você não quer
								reconstruir uma semana depois.
							</p>
						</article>
						<article>
							<ListOrdered />
							<span>02</span>
							<h3>Dê uma ordem à fila</h3>
							<p>
								Transforme “um dia eu jogo” em uma sequência clara, fácil de
								mudar quando a vontade mudar.
							</p>
						</article>
						<article>
							<Clock3 />
							<span>03</span>
							<h3>Escolha pelo tempo disponível</h3>
							<p>
								Use as estimativas do HowLongToBeat para decidir entre uma noite
								curta e uma aventura longa.
							</p>
						</article>
					</div>
				</section>

				<section className={styles.privacy}>
					<EyeOff />
					<div>
						<p className={styles.eyebrow}>Pessoal por definição</p>
						<h2>Sua biblioteca não é uma vitrine.</h2>
						<p>
							Sem seguidores, ranking ou pressão para terminar. Suas anotações
							ficam na sua conta e servem às suas próximas sessões.
						</p>
					</div>
					<button
						type="button"
						className={styles.primary}
						onClick={() => navigate({ to: "/register" })}
					>
						Criar minha biblioteca <ArrowRight />
					</button>
				</section>
			</main>

			<footer className={styles.footer}>
				<a href="/" className={styles.brand}>
					<img src="/logo.svg" alt="" />
					Detonado
				</a>
				<p>Feito para quem joga no próprio ritmo.</p>
				<nav>
					<a href="/privacy">Privacidade</a>
					<a href="/terms">Termos</a>
					<a href="mailto:sac@carvalholabs.com.br">Contato</a>
				</nav>
			</footer>
		</div>
	);
}
