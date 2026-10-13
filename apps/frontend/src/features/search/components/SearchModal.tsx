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
import styles from "./Search.module.css";
export function SearchModal({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) {
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
		library.some((game) => game.igdbId === igdbId);
	function select(game: GameSearchResult) {
		if (inLibrary(game.igdbId)) {
			onClose();
			navigate({
				to: "/library/$igdbId",
				params: { igdbId: String(game.igdbId) },
			});
		} else setAddGame(game);
	}
	return (
		<>
			<DialogPrimitive.Root
				open={open && !addGame}
				onOpenChange={(value) => {
					if (!value) onClose();
				}}
			>
				<DialogPortal>
					<DialogOverlay />
					<DialogPrimitive.Content
						aria-describedby={undefined}
						className={styles.content}
					>
						<div className={styles.box}>
							<DialogPrimitive.Title asChild>
								<div className={styles.searchHead}>
									<Search />
									<input
										ref={inputRef}
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										placeholder="Qual jogo você quer guardar?"
										className={styles.searchInput}
									/>
									<DialogPrimitive.Close asChild>
										<button
											type="button"
											className={styles.close}
											aria-label="Fechar"
										>
											<X />
										</button>
									</DialogPrimitive.Close>
								</div>
							</DialogPrimitive.Title>
							<div className={styles.results}>
								{query.trim().length < 2 ? (
									<div className={styles.message}>
										Digite pelo menos 2 caracteres.
									</div>
								) : isError && !isFetching ? (
									<div className={styles.message}>
										<p>A busca falhou.</p>
										<Button
											size="sm"
											variant="accent"
											onClick={() => void refetch()}
										>
											Tentar de novo
										</Button>
									</div>
								) : isFetching || isPending ? (
									<div className={styles.message}>Buscando…</div>
								) : results.length === 0 ? (
									<div className={styles.message}>
										Nenhum resultado para “{query}”.
									</div>
								) : (
									<>
										<div className={styles.resultCount}>
											{results.length} resultado
											{results.length !== 1 ? "s" : ""}
										</div>
										{results.map((game) => (
											<button
												type="button"
												key={game.igdbId}
												onClick={() => select(game)}
												className={styles.result}
											>
												<div className={styles.resultCover}>
													<Cover
														game={{
															name: game.name,
															year: game.releaseYear,
															platforms: game.platforms,
															cover: {
																hue: 20,
																scheme: "duotone",
																glyph: game.name[0],
															},
															coverUrl: game.coverUrl,
														}}
														size="xs"
														withTitle={false}
													/>
												</div>
												<div className={styles.resultCopy}>
													<div className={styles.resultName}>{game.name}</div>
													<div className={styles.resultMeta}>
														{game.releaseYear ?? "TBA"}
														{game.platforms.length
															? ` · ${game.platforms.slice(0, 2).join(", ")}`
															: ""}
													</div>
												</div>
												<span
													className={
														inLibrary(game.igdbId) ? styles.owned : styles.add
													}
												>
													{inLibrary(game.igdbId)
														? "✓ Na biblioteca"
														: "+ Adicionar"}
												</span>
											</button>
										))}
									</>
								)}
							</div>
							<div className={styles.footer}>↵ selecionar · esc fechar</div>
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
