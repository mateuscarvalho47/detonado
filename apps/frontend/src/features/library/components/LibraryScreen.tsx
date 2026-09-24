import { LayoutGrid, List, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { EmptyState } from "@/shared/components/EmptyState";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { useLibrary } from "../hooks/useLibrary";
import { useLibraryFilters } from "../hooks/useLibraryFilters";
import { LibraryGrid } from "./LibraryGrid";
import { LibraryList } from "./LibraryList";
import { StatusPills } from "./StatusPills";

const SORT_OPTIONS: { value: string; label: string }[] = [
	{ value: "createdAt", label: "Data de adição" },
	{ value: "name", label: "Nome" },
	{ value: "rating", label: "Avaliação" },
	{ value: "hoursPlayed", label: "Horas jogadas" },
];

export function LibraryScreen() {
	const { data, isLoading, isError, refetch } = useLibrary();
	const library = data ?? [];
	const filters = useLibraryFilters(library);
	const { setOpen } = useSearchModal();

	const currentSortLabel =
		SORT_OPTIONS.find((o) => o.value === filters.sort)?.label ?? "Ordenar";

	if (isLoading) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7">
				<div
					className="grid gap-5"
					style={{
						gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
					}}
				>
					{Array.from({ length: 12 }, (_, i) => i).map((i) => (
						<div
							key={i}
							className="aspect-3/4 bg-bg-1 rounded-sm animate-pulse"
						/>
					))}
				</div>
			</div>
		);
	}

	if (isError || !data) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
				<LoadFailure onRetry={() => void refetch()} />
			</div>
		);
	}

	return (
		<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
			{/* Topbar */}
			<div className="flex items-end justify-between gap-6 pb-5.5 mb-5.5 border-b border-border-soft">
				<PageHeader
					overline="Coleção"
					title="Biblioteca"
					subtitle={`${library.length} jogo${library.length !== 1 ? "s" : ""} na coleção`}
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

			{/* Toolbar */}
			<div className="flex flex-col gap-3 mb-4.5">
				<div className="overflow-x-auto -mx-5.5 px-6">
					<div className="flex min-w-max">
						<StatusPills
							library={library}
							active={filters.statusFilter}
							onChange={filters.setStatusFilter}
						/>
					</div>
				</div>

				<div className="flex gap-2 items-center">
					{/* Search */}
					<div className="relative flex items-center gap-2 h-10 px-3 bg-bg-2 border border-border rounded-lg flex-1 sm:w-55 sm:flex-none text-text-lo">
						<Search className="size-3.5 shrink-0" />
						<Input
							value={filters.search}
							onChange={(e) => filters.setSearch(e.target.value)}
							placeholder="Filtrar..."
							className="flex-1 h-full p-0 min-w-0 bg-transparent dark:bg-transparent border-0 shadow-none text-text-hi text-heading placeholder:text-text-lo focus-visible:ring-0 focus-visible:border-0"
						/>
					</div>

					{/* Sort */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="inline-flex items-center gap-1.5 h-8 min-h-11 lg:min-h-0 px-2.5 bg-bg-2 border border-border rounded-md text-text-md cursor-pointer text-body font-medium"
							>
								{currentSortLabel} ↕
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-40">
							{SORT_OPTIONS.map((opt) => (
								<DropdownMenuItem
									key={opt.value}
									onClick={() =>
										filters.setSort(opt.value as typeof filters.sort)
									}
									className="flex items-center justify-between text-body"
									style={{
										color:
											filters.sort === opt.value
												? "var(--color-accent-bright)"
												: undefined,
									}}
								>
									{opt.label}
									{filters.sort === opt.value && <span>✓</span>}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* View toggle */}
					<div className="flex p-0.5 bg-bg-2 border border-border rounded-lg">
						{(["grid", "list"] as const).map((v) => (
							<button
								type="button"
								key={v}
								onClick={() => filters.setView(v)}
								className={cn(
									"flex items-center justify-center size-8 min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded-sm cursor-pointer border-0 transition-all",
									filters.view === v
										? "bg-bg-3 text-text-hi"
										: "bg-transparent text-text-lo",
								)}
							>
								{v === "grid" ? (
									<LayoutGrid className="size-3.5" />
								) : (
									<List className="size-3.5" />
								)}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Content */}
			{library.length === 0 ? (
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			) : filters.filtered.length === 0 ? (
				<EmptyState
					icon={<Search className="size-7" />}
					title="Nenhum jogo neste filtro"
					body="Há jogos no arquivo, mas nenhum combina com a busca ou o status escolhido."
				/>
			) : filters.view === "grid" ? (
				<LibraryGrid games={filters.filtered} />
			) : (
				<LibraryList games={filters.filtered} />
			)}
		</div>
	);
}
