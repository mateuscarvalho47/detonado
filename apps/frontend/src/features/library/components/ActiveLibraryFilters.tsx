import { Button } from "@/components/ui/button";
import { useOrganization } from "@/features/organization/hooks/useOrganization";
import { SOURCE_KINDS } from "@/features/sources/lib/sourceKinds";
import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { useLibraryFilters } from "../hooks/useLibraryFilters";
export function ActiveLibraryFilters({
	filters,
}: {
	filters: ReturnType<typeof useLibraryFilters>;
}) {
	const groups = useOrganization();
	const a = filters.advanced;
	const labels = [
		...filters.activeStatuses.map((status) => STATUS_BY_KEY[status].label),
		filters.search && `Nome/notas: ${filters.search}`,
		a.platform,
		a.genre,
		a.collectionId &&
			`Coleção: ${groups.data?.collections.find((g) => g.id === a.collectionId)?.name ?? (groups.isLoading ? "Carregando…" : groups.isError ? "Erro ao consultar" : "Indisponível")}`,
		a.tagId &&
			`Tag: ${groups.data?.tags.find((g) => g.id === a.tagId)?.name ?? (groups.isLoading ? "Carregando…" : groups.isError ? "Erro ao consultar" : "Indisponível")}`,
		a.maxHours !== undefined &&
			`Até ${a.maxHours}h${a.includeUnknownDuration ? " · inclui sem estimativa" : ""}`,
		SOURCE_KINDS.find((kind) => kind.value === a.sourceKind)?.label,
		a.availability &&
			{
				AVAILABLE: "Disponível",
				EXPIRED: "Acesso vencido",
				UNKNOWN: "Sem origem",
			}[a.availability],
	].filter(Boolean);
	return labels.length ? (
		<section aria-label="Critérios ativos">
			<p>{labels.join(" · ")}</p>
			<Button variant="ghost" onClick={filters.clear}>
				Limpar filtros
			</Button>
		</section>
	) : null;
}
