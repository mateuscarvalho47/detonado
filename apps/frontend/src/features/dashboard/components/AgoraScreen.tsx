import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { SuggestionsPanel } from "@/features/suggestions/components/SuggestionsPanel";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import {
	backlogHours,
	backlogHoursLegend,
	formatBacklogHours,
} from "@/shared/lib/backlogHours";
import { compareQueue } from "@/shared/lib/queueOrder";
import { useAppStore } from "@/store/useAppStore";
import { BacklogList } from "./BacklogList";
import styles from "./Dashboard.module.css";
import { PlayingList } from "./PlayingList";

export function AgoraScreen() {
	const navigate = useNavigate();
	const setStatusFilter = useAppStore((state) => state.setLibraryStatusFilter);
	const setSearch = useAppStore((state) => state.setLibrarySearch);
	const { setOpen } = useSearchModal();
	const { data: library, isLoading, isError, refetch } = useLibrary();
	const entries = useMemo(() => library ?? [], [library]);
	const queue = useMemo(() => backlogHours(entries), [entries]);
	const playing = useMemo(
		() => entries.filter((game) => game.status === "PLAYING"),
		[entries],
	);
	const backlog = useMemo(
		() =>
			entries.filter((game) => game.status === "BACKLOG").sort(compareQueue),
		[entries],
	);

	function openLibrary() {
		setStatusFilter(null);
		setSearch("");
		void navigate({ to: "/library" });
	}

	if (isLoading)
		return (
			<div className={styles.page}>
				<div className={styles.skeleton}>
					{[1, 2, 3].map((item) => (
						<div key={item} className={styles.skeletonItem} />
					))}
				</div>
			</div>
		);
	if (isError || !library)
		return (
			<div className={styles.page}>
				<LoadFailure onRetry={() => void refetch()} />
			</div>
		);

	const counts = [
		{ label: "Em andamento", value: String(playing.length) },
		{ label: "Próximos na fila", value: String(queue.count) },
		{ label: "Tempo estimado", value: formatBacklogHours(queue.total) },
	];

	return (
		<div className={styles.page}>
			<div className={styles.top}>
				<PageHeader
					overline="Seu momento"
					title="Continue de onde parou."
					subtitle="Seu progresso recente e uma fila curta para decidir sem perder tempo."
				/>
				<Button variant="accent" onClick={() => setOpen(true)}>
					Adicionar jogo
				</Button>
			</div>
			{entries.length === 0 ? (
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			) : (
				<div className={styles.layout}>
					<div className={styles.metrics}>
						{counts.map((item) => (
							<div key={item.label} className={styles.metric}>
								<div className={styles.metricLabel}>{item.label}</div>
								<div className={styles.metricValue}>{item.value}</div>
							</div>
						))}
					</div>
					{queue.missing > 0 && (
						<p className={styles.legend}>{backlogHoursLegend(queue)}</p>
					)}
					<SuggestionsPanel library={entries} />
					{playing.length === 0 && backlog.length === 0 ? (
						<p>
							Nada em andamento nem na fila. Veja sua{" "}
							<button
								type="button"
								onClick={openLibrary}
								className={styles.inlineLink}
							>
								biblioteca
							</button>
							.
						</p>
					) : (
						<div className={styles.columns}>
							<PlayingList games={playing} />
							<BacklogList games={backlog} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}
