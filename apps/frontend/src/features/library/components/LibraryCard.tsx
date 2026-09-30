import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";

interface LibraryCardProps {
	game: LibraryEntry;
}

const getCoverData = (game: LibraryEntry) => ({
	hue: STATUS_BY_KEY[game.status]?.hue ?? 280,
	scheme: "duotone" as const,
	glyph: game.name[0],
});

const STATUSES_WITH_HOURS = new Set([
	"PLAYING",
	"PAUSED",
	"COMPLETED",
	"DROPPED",
]);
const STATUSES_WITH_RATING = new Set(["PAUSED", "COMPLETED", "DROPPED"]);

export function LibraryCard({ game }: LibraryCardProps) {
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
			className="flex flex-col gap-2.5 bg-transparent border-0 p-0 cursor-pointer text-left"
		>
			<div className="relative aspect-3/4">
				<Cover
					game={{
						name: game.name,
						platforms: game.platforms,
						cover: getCoverData(game),
						coverUrl: game.coverUrl,
					}}
					size="md"
					hover
				/>
				<div className="absolute top-1.5 right-1.5 max-w-[calc(100%-12px)] pointer-events-none">
					<div className="inline-flex max-w-full bg-bg-0 border border-border-strong px-1.5 py-1">
						<StatusBadge status={game.status} size="sm" />
					</div>
				</div>
			</div>
			<div className="flex flex-col gap-0.5 px-0.5">
				<span className="text-body font-medium text-text-hi leading-[1.3] line-clamp-2">
					{game.name}
				</span>
				<div className="flex items-center justify-between gap-1 min-w-0">
					<span className="text-overline font-mono text-text-lo truncate">
						{game.userPlatform ?? game.platforms[0] ?? "—"}
					</span>
					{STATUSES_WITH_RATING.has(game.status) && game.rating != null && (
						<span className="font-mono text-caption font-semibold text-text-hi">
							{game.rating}
							<span className="text-caption text-text-lo">/10</span>
						</span>
					)}
				</div>
				{STATUSES_WITH_HOURS.has(game.status) && game.hoursPlayed != null && (
					<span className="text-caption font-mono text-text-lo">
						{game.hoursPlayed}h jogadas
					</span>
				)}
			</div>
		</button>
	);
}
