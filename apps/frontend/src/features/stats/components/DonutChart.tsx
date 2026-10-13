import { STATUSES } from "@/shared/constants/statuses";
import type { LibraryStats } from "@/types/api";
import styles from "./Stats.module.css";
export function DonutChart({ stats }: { stats: LibraryStats }) {
	const total = stats.totalGames || 1;
	const circumference = 2 * Math.PI * 70;
	let offset = 0;
	const segments = STATUSES.map((status) => {
		const count = stats.countByStatus[status.key] ?? 0;
		const dash = (count / total) * circumference;
		const segment = { ...status, count, dash, offset };
		offset += dash;
		return segment;
	}).filter((segment) => segment.count > 0);
	return (
		<div className={styles.donutLayout}>
			<div className={styles.donut}>
				<svg
					role="img"
					aria-label="Distribuição por status"
					viewBox="0 0 180 180"
				>
					<circle
						cx="90"
						cy="90"
						r="70"
						fill="none"
						stroke="var(--color-surface-raised)"
						strokeWidth="17"
					/>
					{segments.map((segment) => (
						<circle
							key={segment.key}
							cx="90"
							cy="90"
							r="70"
							fill="none"
							stroke={segment.color}
							strokeWidth="17"
							strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
							strokeDashoffset={-segment.offset}
							transform="rotate(-90 90 90)"
						/>
					))}
				</svg>
				<div className={styles.donutCenter}>
					<span className={styles.donutTotal}>{stats.totalGames}</span>
					<span className={styles.label}>jogos</span>
				</div>
			</div>
			<ul className={styles.legend}>
				{STATUSES.map((status) => {
					const count = stats.countByStatus[status.key] ?? 0;
					return (
						<li key={status.key} className={styles.legendRow}>
							<span
								className={styles.mark}
								style={{ background: status.color }}
							/>
							<span>{status.label}</span>
							<span className={styles.track}>
								<span
									className={styles.bar}
									style={{
										display: "block",
										width: `${(count / total) * 100}%`,
										background: status.color,
									}}
								/>
							</span>
							<span className={styles.count}>{count}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
