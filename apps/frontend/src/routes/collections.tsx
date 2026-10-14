import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import styles from "@/features/library/components/Library.module.css";
import { GroupManager } from "@/features/organization/components/GroupManager";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import { LoadFailure } from "@/shared/components/LoadFailure";
export const Route = createFileRoute("/collections")({
	component: CollectionsPage,
});
function CollectionsPage() {
	const groups = useOrganization();
	return (
		<div className={styles.page}>
			<PageHeader
				overline="Sua biblioteca"
				title="Coleções"
				subtitle="Agrupe seus jogos e abra uma seleção na biblioteca."
			/>
			{groups.isLoading && <p role="status">Carregando coleções…</p>}
			{groups.isError && <LoadFailure onRetry={() => void groups.refetch()} />}
			{groups.isSuccess &&
				(groups.data.collections.length ? (
					<ul>
						{groups.data.collections.map((group) => (
							<li key={group.id}>
								<Link to="/library" search={{ collectionId: group.id }}>
									{group.name}
								</Link>
							</li>
						))}
					</ul>
				) : (
					<p>Nenhuma coleção criada. Crie a primeira abaixo.</p>
				))}
			<GroupManager />
		</div>
	);
}
