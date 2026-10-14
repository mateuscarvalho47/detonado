import { LayoutGrid, List, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BulkEditPanel } from "@/features/bulk/components/BulkEditPanel";
import { useBulkSelection } from "@/features/bulk/hooks/useBulkSelection";
import { CsvImportPanel } from "@/features/import/components/CsvImportPanel";
import { GroupManager } from "@/features/organization/components/GroupManager";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { useLibrary } from "../hooks/useLibrary";
import { useLibraryFilters } from "../hooks/useLibraryFilters";
import styles from "./Library.module.css";
import { LibraryFiltersPanel } from "./LibraryFiltersPanel";
import { LibraryGrid } from "./LibraryGrid";
import { LibraryList } from "./LibraryList";
import { StatusPills } from "./StatusPills";

const SORT_OPTIONS = [
	{ value: "createdAt", label: "Adicionados recentemente" },
	{ value: "queue", label: "Ordem da fila" },
	{ value: "name", label: "Nome" },
	{ value: "rating", label: "Melhor avaliação" },
	{ value: "hoursPlayed", label: "Mais jogados" },
];

export function LibraryScreen() {
	const { data, isLoading, isError, refetch } = useLibrary();
	const library = data ?? [];
	const filters = useLibraryFilters(library);
	const selection = useBulkSelection(filters.filtered);
	const { setOpen } = useSearchModal();
	if (isLoading)
		return (
			<div className={styles.page}>
				<div className={styles.skeletonGrid}>
					{Array.from({ length: 10 }, (_, index) => `skeleton-${index}`).map(
						(key) => (
							<div key={key} className={styles.skeleton} />
						),
					)}
				</div>
			</div>
		);
	if (isError || !data)
		return (
			<div className={styles.page}>
				<LoadFailure onRetry={() => void refetch()} />
			</div>
		);
	return (
		<div className={styles.page}>
			<div className={styles.top}>
				<PageHeader
					overline="Seu arquivo"
					title="Biblioteca"
					subtitle={`${library.length} jogo${library.length !== 1 ? "s" : ""} guardado${library.length !== 1 ? "s" : ""} do seu jeito.`}
				/>
				<Button variant="accent" onClick={() => setOpen(true)}>
					Adicionar jogo
				</Button>
			</div>
			<div className={styles.toolbar}>
				<div className={styles.pillsViewport}>
					<StatusPills
						library={library}
						active={filters.statusFilter}
						selected={filters.activeStatuses}
						onChange={filters.setStatusFilter}
					/>
				</div>
				<div className={styles.controls}>
					<label className={styles.filter} htmlFor="library-filter">
						<span className="sr-only">Filtrar biblioteca</span>
						<Search />
						<Input
							id="library-filter"
							maxLength={100}
							value={filters.search}
							onChange={(event) => filters.setSearch(event.target.value)}
							placeholder="Encontre um jogo na biblioteca"
						/>
					</label>
					<select
						className={styles.sort}
						value={filters.sort}
						onChange={(event) =>
							filters.setSort(event.target.value as typeof filters.sort)
						}
						aria-label="Ordenar biblioteca"
					>
						{SORT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<fieldset
						className={styles.viewToggle}
						aria-label="Formato de exibição"
					>
						{(["grid", "list"] as const).map((view) => (
							<button
								type="button"
								key={view}
								onClick={() => filters.setView(view)}
								className={styles.viewButton}
								data-active={filters.view === view}
								aria-label={
									view === "grid" ? "Exibir em grade" : "Exibir em lista"
								}
								aria-pressed={filters.view === view}
							>
								{view === "grid" ? <LayoutGrid /> : <List />}
							</button>
						))}
					</fieldset>
				</div>
			</div>
			<LibraryFiltersPanel library={library} filters={filters} />
			<GroupManager />
			<CsvImportPanel />
			{selection.active ? (
				<BulkEditPanel
					selection={selection}
					visibleCount={filters.filtered.length}
				/>
			) : (
				<div className={styles.bulkStart}>
					<Button
						variant="outline"
						disabled={!filters.filtered.length}
						onClick={selection.begin}
					>
						Selecionar jogos para editar em lote
					</Button>
				</div>
			)}
			{library.length === 0 ? (
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			) : filters.filtered.length === 0 ? (
				<EmptyState
					icon={<Search />}
					title="Nenhum jogo neste filtro"
					body="Mude os filtros para reencontrar o que procura."
				/>
			) : filters.view === "grid" ? (
				<LibraryGrid
					games={filters.filtered}
					selection={selection.active ? selection : undefined}
				/>
			) : (
				<LibraryList
					games={filters.filtered}
					selection={selection.active ? selection : undefined}
					queueMode={
						!selection.active &&
						filters.activeStatuses.length === 1 &&
						filters.activeStatuses[0] === "BACKLOG" &&
						filters.sort === "queue" &&
						filters.search.trim() === "" &&
						!filters.advanced.platform &&
						!filters.advanced.genre &&
						!filters.advanced.collectionId &&
						!filters.advanced.tagId &&
						!filters.advanced.sourceKind &&
						!filters.advanced.availability &&
						filters.advanced.maxHours === undefined
					}
				/>
			)}
		</div>
	);
}
