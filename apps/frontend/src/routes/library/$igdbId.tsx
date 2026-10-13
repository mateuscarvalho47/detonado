import { createFileRoute } from "@tanstack/react-router";
import { DetailScreen } from "@/features/detail/components/DetailScreen";
import { useLibraryEntry } from "@/features/detail/hooks/useLibraryEntry";
import styles from "@/styles/Routes.module.css";

export const Route = createFileRoute("/library/$igdbId")({
	component: DetailPage,
});

function DetailPage() {
	const { igdbId } = Route.useParams();
	const { data: game, isLoading, error } = useLibraryEntry(Number(igdbId));

	if (isLoading) {
		return (
			<div className={styles.detailState} role="status">
				<span className="sr-only">Carregando jogo</span>
				<div className={styles.detailSkeleton} aria-hidden="true" />
			</div>
		);
	}

	if (error || !game) {
		return (
			<div className={`${styles.detailState} ${styles.detailEmpty}`}>
				<p className={styles.detailEmptyCopy}>
					Jogo não encontrado na biblioteca.
				</p>
			</div>
		);
	}

	return <DetailScreen game={game} />;
}
