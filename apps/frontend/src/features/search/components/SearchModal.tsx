import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useLibrary } from "@/features/library/hooks/useLibrary";
import { Cover } from "@/shared/components/Cover";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { GameSearchResult } from "@/types/api";
import { useGameSearch } from "../hooks/useGameSearch";
import { AddToLibraryModal } from "./AddToLibraryModal";

interface SearchModalProps {
	open: boolean;
	onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
	const [query, setQuery] = useState("");
	const [addGame, setAddGame] = useState<GameSearchResult | null>(null);
	const debouncedQuery = useDebounce(query, 300);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();
	const { data: library = [] } = useLibrary();
	const {
		data: results = [],
		isFetching,
		isPending,
		isError,
		refetch,
	} = useGameSearch(debouncedQuery);

	useEffect(() => {
		if (open) {
			setQuery("");
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	const inLibrary = (igdbId: number) =>
		library.some((g) => g.igdbId === igdbId);

	const handleSelect = (game: GameSearchResult) => {
		if (inLibrary(game.igdbId)) {
			onClose();
			navigate({
				to: "/library/$igdbId",
				params: { igdbId: String(game.igdbId) },
			});
		} else {
			setAddGame(game);
		}
	};

	return (
		<>
			<DialogPrimitive.Root
				open={open && !addGame}
				onOpenChange={(o) => {
					if (!o) onClose();
				}}
			>
				<DialogPortal>
					<DialogOverlay className="bg-black/60 backdrop-blur-md supports-backdrop-filter:backdrop-blur-md" />
					<DialogPrimitive.Content
						aria-describedby={undefined}
						className="fixed top-5 sm:top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-160 px-4 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-3 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-3 duration-200"
					>
						<div className="w-full rounded-xl border border-border overflow-hidden bg-bg-1 shadow-modal">
							{/* Header */}
							<DialogPrimitive.Title asChild>
								<div className="flex items-center gap-2.5 px-5 py-3.5 text-text-md border-b border-border-soft">
									<Search className="size-4 shrink-0" />
									<input
										ref={inputRef}
										value={query}
										onChange={(e) => setQuery(e.target.value)}
										placeholder="Buscar jogos..."
										className="flex-1 h-7 bg-transparent border-0 outline-none text-text-hi text-body"
									/>
									<DialogPrimitive.Close asChild>
										<button
											type="button"
											className="flex items-center justify-center size-6 min-h-11 min-w-11 lg:min-h-0 lg:min-w-0 rounded-md text-text-lo hover:text-text-hi hover:bg-bg-2 transition-colors cursor-pointer"
										>
											<X className="size-3.5" />
										</button>
									</DialogPrimitive.Close>
								</div>
							</DialogPrimitive.Title>

							{/* Results */}
							<div className="max-h-90 overflow-y-auto p-1.5">
								{query.trim().length < 2 ? (
									<div className="py-10 px-5 text-center text-text-lo text-heading">
										Digite pelo menos 2 caracteres para buscar
									</div>
								) : isError && !isFetching ? (
									<div className="py-10 px-5 text-center flex flex-col items-center gap-3">
										<p className="text-text-lo text-heading m-0">
											A busca falhou.
										</p>
										<Button
											type="button"
											variant="accent"
											size="sm"
											onClick={() => void refetch()}
											className="rounded-lg"
										>
											Tentar de novo
										</Button>
									</div>
								) : isFetching || isPending ? (
									<div className="py-10 px-5 text-center text-text-lo text-heading">
										Buscando...
									</div>
								) : results.length === 0 ? (
									<div className="py-10 px-5 text-center text-text-lo text-heading">
										Nenhum resultado para "{query}"
									</div>
								) : (
									<>
										<div className="font-mono text-overline tracking-[0.08em] uppercase text-text-dim px-3 pt-2.5 pb-1.5">
											{results.length} resultado
											{results.length !== 1 ? "s" : ""}
										</div>
										{results.map((game) => {
											const owned = inLibrary(game.igdbId);
											return (
												<button
													type="button"
													key={game.igdbId}
													onClick={() => handleSelect(game)}
													className="grid gap-3 items-center w-full px-3 py-2.5 bg-transparent border-0 rounded-lg cursor-pointer text-left transition-[background] hover:bg-bg-2"
													style={{
														gridTemplateColumns: "36px 1fr auto",
													}}
												>
													<div className="w-9 h-12 rounded-lg overflow-hidden">
														<Cover
															game={{
																name: game.name,
																year: game.releaseYear,
																platforms: game.platforms,
																cover: {
																	hue: 295,
																	scheme: "duotone",
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
															{game.releaseYear ?? "TBA"}
															{game.platforms.length
																? ` · ${game.platforms.slice(0, 2).join(", ")}`
																: ""}
														</div>
													</div>
													<div className="text-caption font-mono">
														{owned ? (
															<span style={{ color: "oklch(0.58 0.25 17)" }}>
																✓ Na biblioteca
															</span>
														) : (
															<span className="text-text-lo">+ Adicionar</span>
														)}
													</div>
												</button>
											);
										})}
									</>
								)}
							</div>

							{/* Footer */}
							<div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-soft font-mono text-caption text-text-lo bg-bg-2">
								<span>↵ selecionar</span>
							</div>
						</div>
					</DialogPrimitive.Content>
				</DialogPortal>
			</DialogPrimitive.Root>

			{addGame && (
				<AddToLibraryModal
					game={addGame}
					onClose={() => setAddGame(null)}
					onAdded={(id) => {
						setAddGame(null);
						onClose();
						navigate({
							to: "/library/$igdbId",
							params: { igdbId: String(id) },
						});
					}}
				/>
			)}
		</>
	);
}
