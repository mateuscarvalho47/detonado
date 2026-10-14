import { useMemo } from "react";
import { STATUSES } from "@/shared/constants/statuses";
import type { GameStatus, LibraryEntry } from "@/types/api";
import styles from "./Library.module.css";
export function StatusPills({
	library,
	active,
	onChange,
}: {
	library: LibraryEntry[];
	active: GameStatus | null;
	onChange: (status: GameStatus | null) => void;
}) {
	const counts = useMemo(() => {
		const result = {} as Record<GameStatus, number>;
		for (const game of library)
			result[game.status] = (result[game.status] ?? 0) + 1;
		return result;
	}, [library]);
	return (
		<div className={styles.pills}>
			<button
				type="button"
				onClick={() => onChange(null)}
				className={styles.pill}
				data-active={active === null}
			>
				<span>Todos</span>
				<span className={styles.pillCount}>{library.length}</span>
			</button>
			{STATUSES.map((status) => (
				<button
					type="button"
					key={status.key}
					onClick={() => onChange(active === status.key ? null : status.key)}
					className={styles.pill}
					data-active={active === status.key}
					aria-pressed={active === status.key}
					style={{ "--pill-color": status.color } as React.CSSProperties}
				>
					<span>{status.label}</span>
					<span className={styles.pillCount}>{counts[status.key] ?? 0}</span>
				</button>
			))}
		</div>
	);
}
