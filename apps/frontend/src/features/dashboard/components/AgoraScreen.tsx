import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import {
	backlogHours,
	backlogHoursLegend,
	formatBacklogHours,
} from "@/shared/lib/backlogHours";
import { BacklogList } from "./BacklogList";
import { PlayingList } from "./PlayingList";

export function AgoraScreen() {
	const { setOpen } = useSearchModal();
	const {
		data: library,
		isLoading: libraryLoading,
		isError: libraryError,
		refetch: refetchLibrary,
	} = useLibrary();

	const entries = useMemo(() => library ?? [], [library]);
	const queue = useMemo(() => backlogHours(entries), [entries]);
	const playing = useMemo(
		() => entries.filter((g) => g.status === "PLAYING"),
		[entries],
	);
	const backlog = useMemo(
		() => entries.filter((g) => g.status === "BACKLOG"),
		[entries],
	);

	if (libraryLoading) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7">
				<div className="flex flex-col gap-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-20 bg-bg-1 animate-pulse" />
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

	const counts = [
		{ label: "Jogando", value: String(playing.length) },
		{ label: "Na fila", value: String(queue.count) },
		{ label: "Horas na fila", value: formatBacklogHours(queue.total) },
	];

	return (
		<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
			<div className="flex items-end justify-between gap-3 pb-5.5 mb-5.5 border-b border-border-soft flex-wrap">
				<PageHeader
					overline="Biblioteca"
					title="Agora"
					subtitle="O que está em andamento e o que vem na fila."
				/>
				<Button variant="accent" size="sm" onClick={() => setOpen(true)}>
					Adicionar jogo
				</Button>
			</div>

			{entries.length === 0 ? (
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			) : (
				<div className="flex flex-col gap-5">
					<div className="grid grid-cols-3 border border-border-soft bg-bg-1">
						{counts.map((item, index) => (
							<div
								key={item.label}
								className={
									index < counts.length - 1
										? "px-4 py-3 border-r border-border-soft"
										: "px-4 py-3"
								}
							>
								<div className="font-mono text-caption text-text-lo">
									{item.label}
								</div>
								<div className="mt-1 text-2xl font-semibold tabular-nums text-text-hi">
									{item.value}
								</div>
							</div>
						))}
					</div>
					{queue.missing > 0 && (
						<p className="m-0 -mt-2 text-caption text-text-lo">
							{backlogHoursLegend(queue)}
						</p>
					)}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<PlayingList games={playing} />
						<BacklogList games={backlog} />
					</div>
				</div>
			)}
		</div>
	);
}
