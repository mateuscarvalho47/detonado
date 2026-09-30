import { useNavigate } from "@tanstack/react-router";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { LibraryEntry } from "@/types/api";

const BACKLOG_HUE = STATUS_BY_KEY.BACKLOG.hue;

interface BacklogListProps {
	games: LibraryEntry[];
}

export function BacklogList({ games }: BacklogListProps) {
	const navigate = useNavigate();
	const shown = games.slice(0, 5);

	return (
		<div className="bg-bg-1 border border-border-soft p-5">
			<div className="flex items-start justify-between mb-3.5">
				<div>
					<div className="text-heading font-semibold text-text-hi tracking-[-0.01em]">
						Próximos na fila
					</div>
					<div className="font-mono text-caption text-text-lo mt-0.5">
						{games.length} na fila
					</div>
				</div>
				{games.length > 5 && (
					<button
						type="button"
						onClick={() => navigate({ to: "/library" })}
						className="inline-flex items-center gap-1 bg-transparent border-0 text-text-md text-caption font-mono cursor-pointer px-1.5 py-1"
					>
						Ver todos →
					</button>
				)}
			</div>

			{shown.length === 0 ? (
				<div className="py-6 text-center text-text-lo text-body">
					Fila vazia
				</div>
			) : (
				<div className="flex flex-col">
					{shown.map((game, idx) => (
						<button
							type="button"
							key={game.igdbId}
							onClick={() =>
								navigate({
									to: "/library/$igdbId",
									params: { igdbId: String(game.igdbId) },
								})
							}
							className={`grid grid-cols-[32px_36px_1fr_14px] gap-3 items-center px-2 py-2.5 bg-transparent border-0 cursor-pointer text-left w-full transition-[background] hover:bg-bg-2 font-[inherit]${idx < shown.length - 1 ? " border-b border-border-soft" : ""}`}
						>
							<span className="text-caption text-text-dim font-medium">
								#{idx + 1}
							</span>
							<div className="w-9 h-12 rounded-[2px] overflow-hidden">
								<Cover
									game={{
										name: game.name,
										platforms: game.platforms,
										cover: {
											hue: BACKLOG_HUE,
											scheme: "duotone" as const,
											glyph: game.name[0],
										},
										coverUrl: game.coverUrl,
									}}
									size="xs"
									withTitle={false}
								/>
							</div>
							<div>
								<div className="text-body font-medium text-text-hi">
									{game.name}
								</div>
								<div className="text-caption font-mono text-text-lo mt-0.5">
									{game.userPlatform ?? game.platforms[0] ?? "—"}
								</div>
							</div>
							<span className="text-text-dim text-caption">›</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
