import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";
import styles from "./Library.module.css";

const STATUSES_WITH_HOURS = new Set([
	"PLAYING",
	"PAUSED",
	"COMPLETED",
	"DROPPED",
]);
const STATUSES_WITH_RATING = new Set(["PAUSED", "COMPLETED", "DROPPED"]);
export function LibraryCard({ game }: { game: LibraryEntry }) {
	const navigate = useNavigate();
	return (
		<button
			type="button"
			onClick={() =>
				navigate({
					to: "/library/$igdbId",
					params: { igdbId: String(game.igdbId) },
				})
			}
			className={styles.card}
		>
			<div className={styles.cardCover}>
				<Cover
					game={{
						name: game.name,
						platforms: game.platforms,
						cover: {
							hue: STATUS_BY_KEY[game.status]?.hue ?? 280,
							scheme: "duotone",
							glyph: game.name[0],
						},
						coverUrl: game.coverUrl,
					}}
					size="md"
					hover
				/>
			</div>
			<div className={styles.cardBody}>
				<div className={styles.cardStatus}>
					<StatusBadge status={game.status} size="sm" />
				</div>
				<span className={styles.cardName}>{game.name}</span>
				<div className={styles.cardMeta}>
					<span className={styles.truncate}>
						{game.userPlatform ?? game.platforms[0] ?? "—"}
					</span>
					{STATUSES_WITH_RATING.has(game.status) && game.rating != null && (
						<span className={styles.rating}>{game.rating}/10</span>
					)}
				</div>
				{STATUSES_WITH_HOURS.has(game.status) && game.hoursPlayed != null && (
					<span className={styles.hours}>{game.hoursPlayed}h jogadas</span>
				)}
			</div>
		</button>
	);
}
