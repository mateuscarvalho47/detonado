import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Play } from "lucide-react";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { firstSentence } from "@/shared/lib/notes";
import type { LibraryEntry } from "@/types/api";
import styles from "./Dashboard.module.css";

function openGame(
	navigate: ReturnType<typeof useNavigate>,
	game: LibraryEntry,
) {
	void navigate({
		to: "/library/$igdbId",
		params: { igdbId: String(game.igdbId) },
	});
}

function GameCover({
	game,
	size = "sm",
}: {
	game: LibraryEntry;
	size?: "sm" | "lg";
}) {
	return (
		<Cover
			game={{
				name: game.name,
				platforms: game.platforms,
				cover: {
					hue: STATUS_BY_KEY.PLAYING.hue,
					scheme: "duotone",
					glyph: game.name[0],
				},
				coverUrl: game.coverUrl,
			}}
			size={size}
			withTitle={false}
		/>
	);
}

export function PlayingList({ games }: { games: LibraryEntry[] }) {
	const navigate = useNavigate();
	const { setOpen } = useSearchModal();
	const featured = games[0];
	return (
		<section className={`${styles.panel} ${styles.playingPanel}`}>
			<div className={styles.panelHead}>
				<div>
					<div className={styles.sectionSignal}>
						<Play /> Slot ativo
					</div>
					<h2 className={styles.panelTitle}>Continue sua campanha</h2>
				</div>
				<button
					type="button"
					onClick={() => setOpen(true)}
					className={styles.textAction}
				>
					+ Adicionar
				</button>
			</div>
			{!featured ? (
				<div className={styles.empty}>
					Marque um jogo como “Jogando” para criar seu slot de retomada.
				</div>
			) : (
				<>
					<button
						type="button"
						onClick={() => openGame(navigate, featured)}
						className={styles.featuredGame}
					>
						<div className={styles.featuredCover}>
							<GameCover game={featured} size="lg" />
						</div>
						<div className={styles.featuredCopy}>
							<span className={styles.gameMeta}>
								JOGANDO ·{" "}
								{featured.userPlatform ??
									featured.platforms[0] ??
									"PLATAFORMA LIVRE"}
							</span>
							<strong className={styles.featuredName}>{featured.name}</strong>
							{firstSentence(featured.notes) ? (
								<span className={styles.checkpoint}>
									Checkpoint · {firstSentence(featured.notes)}
								</span>
							) : (
								<span className={styles.checkpoint}>
									Abra o registro e anote onde você parou.
								</span>
							)}
							<span className={styles.resume}>
								Abrir registro <ArrowRight />
							</span>
						</div>
					</button>
					{games.slice(1).map((game) => (
						<button
							type="button"
							key={game.igdbId}
							onClick={() => openGame(navigate, game)}
							className={styles.gameRow}
						>
							<div className={styles.cover}>
								<GameCover game={game} />
							</div>
							<div className={styles.gameCopy}>
								<span className={styles.gameName}>{game.name}</span>
								<span className={styles.gameMeta}>
									{game.userPlatform ?? game.platforms[0]}
									{game.hoursPlayed ? ` · ${game.hoursPlayed}h` : ""}
								</span>
								{firstSentence(game.notes) && (
									<span className={styles.note}>
										{firstSentence(game.notes)}
									</span>
								)}
							</div>
							<ArrowRight className={styles.rowArrow} />
						</button>
					))}
				</>
			)}
		</section>
	);
}
