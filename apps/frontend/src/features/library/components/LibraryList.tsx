import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import styles from "./Library.module.css";
import { QueueMoveButtons } from "./QueueMoveButtons";

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "2-digit",
	});
}
const COLUMNS = [
	"Jogo",
	"Status",
	"Plataforma",
	"Avaliação",
	"Horas",
	"Adicionado",
];

export function LibraryList({
	games,
	queueMode = false,
}: {
	games: LibraryEntry[];
	queueMode?: boolean;
}) {
	const navigate = useNavigate();
	return (
		<div className={styles.list}>
			<div className={styles.listHeader}>
				<div />
				{COLUMNS.map((column) => (
					<div key={column}>{column}</div>
				))}
			</div>
			{games.map((game, index) => {
				const cover = {
					hue: STATUS_BY_KEY[game.status]?.hue ?? 280,
					scheme: "duotone" as const,
					glyph: game.name[0],
				};
				const content = (
					<>
						<div className={styles.mobileRow}>
							<div className={styles.rowCover}>
								<Cover
									game={{
										name: game.name,
										platforms: game.platforms,
										cover,
										coverUrl: game.coverUrl,
									}}
									size="xs"
									withTitle={false}
								/>
							</div>
							<div>
								<div className={styles.rowName}>{game.name}</div>
								<div className={styles.rowSub}>
									{game.userPlatform ?? game.platforms[0] ?? "—"}
								</div>
							</div>
							<div className={styles.mobileAside}>
								<StatusBadge status={game.status} size="sm" />
								{game.rating != null && (
									<span className={styles.number}>{game.rating}/10</span>
								)}
							</div>
						</div>
						<div className={styles.desktopRow}>
							<div className={styles.rowCover}>
								<Cover
									game={{
										name: game.name,
										platforms: game.platforms,
										cover,
										coverUrl: game.coverUrl,
									}}
									size="xs"
									withTitle={false}
								/>
							</div>
							<div>
								<div className={styles.rowName}>{game.name}</div>
								{game.genres.length > 0 && (
									<div className={styles.rowSub}>
										{game.genres.slice(0, 2).join(" · ")}
									</div>
								)}
							</div>
							<div>
								<StatusBadge status={game.status} size="sm" />
							</div>
							<div className={styles.cell}>
								{game.userPlatform ?? game.platforms[0] ?? "—"}
							</div>
							<div className={styles.number}>
								{game.rating != null ? `${game.rating}/10` : "—"}
							</div>
							<div className={styles.number}>
								{game.hoursPlayed != null ? `${game.hoursPlayed}h` : "—"}
							</div>
							<div className={styles.rowSub}>{formatDate(game.createdAt)}</div>
						</div>
					</>
				);
				return (
					<div key={game.igdbId} className={styles.rowWrap}>
						<button
							type="button"
							onClick={() =>
								navigate({
									to: "/library/$igdbId",
									params: { igdbId: String(game.igdbId) },
								})
							}
							className={styles.rowButton}
						>
							{content}
						</button>
						{queueMode && (
							<div className={styles.queueControls}>
								<QueueMoveButtons
									id={game.id}
									name={game.name}
									isFirst={index === 0}
									isLast={index === games.length - 1}
								/>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
