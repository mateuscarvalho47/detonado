import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";

function fmtDate(iso: string) {
	return new Date(iso).toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "2-digit",
	});
}

interface LibraryListProps {
	games: LibraryEntry[];
}

const COLS = [
	"Jogo",
	"Status",
	"Plataforma",
	"Avaliação",
	"Horas",
	"Adicionado",
];
const DESKTOP_GRID = "48px 2.2fr 1.1fr 1fr 0.9fr 0.7fr 0.85fr";
const MOBILE_GRID = "40px 1fr auto";

export function LibraryList({ games }: LibraryListProps) {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col bg-bg-1 border border-border-soft overflow-hidden">
			{/* Header — desktop only */}
			<div
				className="hidden md:grid gap-3.5 items-center px-4 py-3 font-mono text-overline uppercase tracking-[0.06em] text-text-lo border-b border-border-soft bg-bg-2"
				style={{ gridTemplateColumns: DESKTOP_GRID }}
			>
				<div />
				{COLS.map((c) => (
					<div key={c}>{c}</div>
				))}
			</div>

			{games.map((game, idx) => {
				const borderStyle =
					idx < games.length - 1
						? "1px solid var(--color-border-soft)"
						: undefined;
				const cover = {
					hue: STATUS_BY_KEY[game.status]?.hue ?? 280,
					scheme: "duotone" as const,
					glyph: game.name[0],
				};

				return (
					<button
						type="button"
						key={game.igdbId}
						onClick={() =>
							navigate({
								to: "/library/$igdbId",
								params: { igdbId: String(game.igdbId) },
							})
						}
						className="bg-transparent border-0 cursor-pointer text-left text-heading transition-[background] w-full hover:bg-bg-2"
						style={{ borderBottom: borderStyle }}
					>
						{/* Mobile row */}
						<div
							className="md:hidden grid items-center gap-3 px-4 py-2.5"
							style={{ gridTemplateColumns: MOBILE_GRID }}
						>
							<div className="w-10 h-13.5">
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
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-body text-text-hi font-medium truncate">
									{game.name}
								</span>
								<span className="text-caption font-mono text-text-lo truncate">
									{game.userPlatform ?? game.platforms[0] ?? "—"}
								</span>
							</div>
							<div className="flex flex-col items-end gap-1">
								<StatusBadge status={game.status} size="sm" />
								{game.rating != null && (
									<span className="font-mono text-overline font-semibold text-text-hi">
										{game.rating}
										<span className="text-caption text-text-lo">/10</span>
									</span>
								)}
							</div>
						</div>

						{/* Desktop row */}
						<div
							className="hidden md:grid gap-3.5 items-center px-4 py-2.5"
							style={{ gridTemplateColumns: DESKTOP_GRID }}
						>
							<div className="w-9 h-12">
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
							<div className="flex flex-col gap-0.5 min-w-0">
								<span className="text-text-hi font-medium truncate">
									{game.name}
								</span>
								{game.genres.length > 0 && (
									<span className="text-caption font-mono text-text-lo truncate">
										{game.genres.slice(0, 2).join(" · ")}
									</span>
								)}
							</div>
							<div>
								<StatusBadge status={game.status} size="sm" />
							</div>
							<div className="text-text-md text-body">
								{game.userPlatform ?? game.platforms[0] ?? "—"}
							</div>
							<div className="font-mono font-semibold text-text-hi">
								{game.rating != null ? (
									<>
										{game.rating}
										<span className="text-caption text-text-lo">/10</span>
									</>
								) : (
									<span className="text-text-dim">—</span>
								)}
							</div>
							<div className="font-mono text-text-md text-body">
								{game.hoursPlayed != null ? `${game.hoursPlayed}h` : "—"}
							</div>
							<div className="font-mono text-text-lo text-body">
								{fmtDate(game.createdAt)}
							</div>
						</div>
					</button>
				);
			})}
		</div>
	);
}
