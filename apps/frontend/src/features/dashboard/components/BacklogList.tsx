import { useNavigate } from "@tanstack/react-router";
import { QueueMoveButtons } from "@/features/library/components/QueueMoveButtons";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { queueCaption } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import type { LibraryEntry } from "@/types/api";
import styles from "./Dashboard.module.css";

export function BacklogList({ games }: { games: LibraryEntry[] }) {
	const navigate = useNavigate();
	const setStatusFilter = useAppStore((state) => state.setLibraryStatusFilter);
	const setSort = useAppStore((state) => state.setLibrarySortField);
	const setSearch = useAppStore((state) => state.setLibrarySearch);
	const shown = games.slice(0, 5);
	function openQueue() {
		setStatusFilter("BACKLOG");
		setSort("queue");
		setSearch("");
		void navigate({ to: "/library" });
	}
	const openGame = (igdbId: number) =>
		void navigate({
			to: "/library/$igdbId",
			params: { igdbId: String(igdbId) },
		});
	return (
		<section className={styles.panel}>
			<div className={styles.panelHead}>
				<div>
					<h2 className={styles.panelTitle}>Próximos na fila</h2>
					<p className={styles.panelCount}>
						{games.length} jogo{games.length !== 1 ? "s" : ""}
					</p>
				</div>
				{games.length > 0 && (
					<button
						type="button"
						onClick={openQueue}
						className={styles.textAction}
					>
						Ver fila →
					</button>
				)}
			</div>
			{shown.length === 0 ? (
				<div className={styles.empty}>
					Sua fila está livre. Escolha algo quando der vontade.
				</div>
			) : (
				shown.map((game, index) => (
					<div key={game.igdbId} className={styles.queueRow}>
						<span className={styles.position}>#{index + 1}</span>
						<button
							type="button"
							onClick={() => openGame(game.igdbId)}
							className={styles.queueGame}
						>
							<div className={styles.queueCover}>
								<Cover
									game={{
										name: game.name,
										platforms: game.platforms,
										cover: {
											hue: STATUS_BY_KEY.BACKLOG.hue,
											scheme: "duotone",
											glyph: game.name[0],
										},
										coverUrl: game.coverUrl,
									}}
									size="xs"
									withTitle={false}
								/>
							</div>
							<div className={styles.queueCopy}>
								<div className={styles.gameName}>{game.name}</div>
								<div className={styles.gameMeta}>{queueCaption(game)}</div>
							</div>
						</button>
						<QueueMoveButtons
							id={game.id}
							name={game.name}
							isFirst={index === 0}
							isLast={index === games.length - 1}
						/>
					</div>
				))
			)}
		</section>
	);
}
