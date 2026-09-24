import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { useStats } from "@/features/stats/hooks/useStats";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { backlogHours } from "@/shared/lib/backlogHours";
import { ActivityRibbon } from "./ActivityRibbon";
import { BacklogList } from "./BacklogList";
import { PlayingList } from "./PlayingList";
import { RecentList } from "./RecentList";
import { StatTiles, type StatsTileStatus } from "./StatTiles";
import { StatusBarsCard } from "./StatusBarsCard";

export function DashboardScreen() {
	const { setOpen } = useSearchModal();

	const {
		data: library,
		isLoading: libraryLoading,
		isError: libraryError,
		refetch: refetchLibrary,
	} = useLibrary();
	const {
		data: stats,
		isLoading: statsLoading,
		isError: statsError,
		refetch: refetchStats,
	} = useStats();

	const entries = useMemo(() => library ?? [], [library]);
	const queue = useMemo(() => backlogHours(entries), [entries]);

	const { playing, backlog, recent } = useMemo(() => {
		const playing = entries.filter((g) => g.status === "PLAYING");
		const backlog = entries.filter((g) => g.status === "BACKLOG");
		const recent = entries
			.filter((g) => g.status === "COMPLETED")
			.sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
		return { playing, backlog, recent };
	}, [entries]);

	if (libraryLoading) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7">
				<div className="flex flex-col gap-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-20 bg-bg-1 rounded-lg animate-pulse" />
					))}
				</div>
			</div>
		);
	}

	if (libraryError || !library) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
				<LoadFailure onRetry={() => void refetchLibrary()} />
			</div>
		);
	}

	const statsStatus: StatsTileStatus = stats
		? "ready"
		: statsLoading && !statsError
			? "loading"
			: "error";

	return (
		<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
			<div className="flex items-end justify-between gap-3 pb-5.5 mb-5.5 border-b border-border-soft flex-wrap">
				<PageHeader
					overline="Início"
					title="Dashboard"
					subtitle="Visão geral da sua biblioteca"
				/>
				<Button
					variant="accent"
					size="sm"
					onClick={() => setOpen(true)}
					className="rounded-lg"
				>
					+ Adicionar jogo
				</Button>
			</div>

			{entries.length === 0 ? (
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			) : (
				<div className="flex flex-col gap-5">
					{statsStatus === "error" && (
						<LoadFailure
							compact
							title="Não foi possível carregar as estatísticas"
							body="Os outros números não chegaram. A soma da fila continua aqui."
							onRetry={() => void refetchStats()}
						/>
					)}
					<StatTiles
						stats={stats}
						backlog={queue}
						statsStatus={statsStatus}
					/>
					<ActivityRibbon library={entries} />
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<PlayingList games={playing} />
						<BacklogList games={backlog} />
					</div>
					<div className="grid grid-cols-1 md:grid-cols-[7fr_5fr] gap-5">
						<RecentList games={recent} />
						{stats ? (
							<StatusBarsCard stats={stats} />
						) : statsStatus === "loading" ? (
							<div className="h-40 bg-bg-1 rounded-lg animate-pulse" />
						) : (
							<div className="bg-bg-1 border border-border-soft rounded-lg px-6 py-5 text-body text-text-md">
								Por status indisponível.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
