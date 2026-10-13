import styles from "./Stats.module.css";
export function HBars({
	items,
	color = "var(--color-accent)",
}: {
	items: { label: string; count: number }[];
	color?: string;
}) {
	const max = Math.max(...items.map((item) => item.count), 1);
	return (
		<div className={styles.bars}>
			{items.map((item) => (
				<div key={item.label} className={styles.barRow}>
					<span className={styles.truncate}>{item.label}</span>
					<span className={styles.track}>
						<span
							className={styles.bar}
							style={{
								display: "block",
								width: `${(item.count / max) * 100}%`,
								background: color,
							}}
						/>
					</span>
					<span className={styles.count}>{item.count}</span>
				</div>
			))}
		</div>
	);
}
