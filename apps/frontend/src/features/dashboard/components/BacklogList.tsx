import { useNavigate } from "@tanstack/react-router";
import { QueueMoveButtons } from "@/features/library/components/QueueMoveButtons";
import { Cover } from "@/shared/components/Cover";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import { queueCaption } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import type { LibraryEntry } from "@/types/api";

const BACKLOG_HUE = STATUS_BY_KEY.BACKLOG.hue;

interface BacklogListProps {
	games: LibraryEntry[];
}

export function BacklogList({ games }: BacklogListProps) {
	const navigate = useNavigate();
	const setStatusFilter = useAppStore((s) => s.setLibraryStatusFilter);
	const setSort = useAppStore((s) => s.setLibrarySortField);
	const setSearch = useAppStore((s) => s.setLibrarySearch);
	const shown = games.slice(0, 5);

	function openQueue() {
		setStatusFilter("BACKLOG");
		setSort("queue");
		setSearch("");
		void navigate({ to: "/library" });
	}

	function openGame(igdbId: number) {
		void navigate({
			to: "/library/$igdbId",
			params: { igdbId: String(igdbId) },
		});
	}

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
				{games.length > 0 && (
					<button
						type="button"
						onClick={openQueue}
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
						<div
							key={game.igdbId}
							className={`flex items-center gap-3 px-2 py-2.5${idx < shown.length - 1 ? " border-b border-border-soft" : ""}`}
						>
							<span className="w-8 shrink-0 text-caption text-text-dim font-medium">
								#{idx + 1}
							</span>
							<button
								type="button"
								onClick={() => openGame(game.igdbId)}
								className="flex flex-1 items-center gap-3 min-w-0 bg-transparent border-0 cursor-pointer text-left font-[inherit] hover:bg-bg-2"
							>
								<div className="w-9 h-12 shrink-0">
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
								<div className="min-w-0">
									<div className="text-body font-medium text-text-hi truncate">
										{game.name}
									</div>
									<div className="text-caption font-mono text-text-lo mt-0.5">
										{queueCaption(game)}
									</div>
								</div>
							</button>
							<QueueMoveButtons
								id={game.id}
								name={game.name}
								isFirst={idx === 0}
								isLast={idx === games.length - 1}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
