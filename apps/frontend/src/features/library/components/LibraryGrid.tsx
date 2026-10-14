import type { SelectionControls } from "@/features/bulk/hooks/useBulkSelection";
import type { LibraryEntry } from "@/types/api";
import styles from "./Library.module.css";
import { LibraryCard } from "./LibraryCard";
export function LibraryGrid({
	games,
	selection,
}: {
	games: LibraryEntry[];
	selection?: SelectionControls;
}) {
	return (
		<div className={styles.grid}>
			{games.map((game) =>
				selection ? (
					<div key={game.igdbId} className={styles.selectableCard}>
						<label className={styles.cardSelection}>
							<input
								type="checkbox"
								aria-label={`Selecionar ${game.name}`}
								checked={selection.selectedIds.has(game.id)}
								disabled={
									selection.locked ||
									(selection.selectedIds.size >= 100 &&
										!selection.selectedIds.has(game.id))
								}
								onChange={() => selection.toggle(game.id)}
							/>
							Selecionar
						</label>
						<LibraryCard game={game} />
					</div>
				) : (
					<LibraryCard key={game.igdbId} game={game} />
				),
			)}
		</div>
	);
}
