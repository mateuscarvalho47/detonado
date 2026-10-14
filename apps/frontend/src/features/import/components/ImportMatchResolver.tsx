import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGameSearch } from "@/features/search/hooks/useGameSearch";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { GameSearchResult } from "@/types/api";
import styles from "./CsvImportPanel.module.css";
export function ImportMatchResolver({
	name,
	disabled,
	onSelect,
}: {
	name: string;
	disabled: boolean;
	onSelect: (game: GameSearchResult) => void;
}) {
	const [search, setSearch] = useState(name);
	const query = useGameSearch(useDebounce(search, 300));
	return (
		<div className={styles.resolver}>
			<label>
				Buscar correspondência no IGDB
				<input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					minLength={2}
					maxLength={200}
					disabled={disabled}
				/>
			</label>
			{search.trim().length < 2 ? (
				<p>Digite pelo menos dois caracteres.</p>
			) : query.isFetching ? (
				<p role="status">Buscando jogos…</p>
			) : query.isError ? (
				<p role="alert">
					{query.error.message}{" "}
					<Button variant="ghost" onClick={() => void query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			) : !query.data?.length ? (
				<p>Nenhum jogo encontrado. Ajuste o nome.</p>
			) : (
				<ul>
					{query.data.map((game) => (
						<li key={game.igdbId}>
							<Button
								variant="outline"
								disabled={disabled}
								onClick={() => onSelect(game)}
							>
								{game.name} · {game.releaseYear ?? "Ano não informado"} ·{" "}
								{game.platforms.slice(0, 2).join(", ")} · IGDB {game.igdbId}
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
