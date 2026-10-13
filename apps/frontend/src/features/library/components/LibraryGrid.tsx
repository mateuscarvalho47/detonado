import type { LibraryEntry } from "@/types/api";
import styles from "./Library.module.css";
import { LibraryCard } from "./LibraryCard";
export function LibraryGrid({ games }: { games: LibraryEntry[] }) {
	return (
		<div className={styles.grid}>
			{games.map((game) => (
				<LibraryCard key={game.igdbId} game={game} />
			))}
		</div>
	);
}
