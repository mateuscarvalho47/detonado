import type { LibraryStats } from "@/types/api";
import styles from "./Stats.module.css";
export function Histogram({
	distribution,
}: {
	distribution: LibraryStats["ratingDistribution"];
}) {
	const max = Math.max(...distribution.map((item) => item.count), 1);
	return (
		<div className={styles.histogram}>
			{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => {
				const count =
					distribution.find((item) => item.rating === rating)?.count ?? 0;
				return (
					<div key={rating} className={styles.histColumn}>
						<div className={styles.histBarWrap}>
							<div
								className={styles.histBar}
								style={{
									height: `${(count / max) * 100}%`,
									background:
										count === max && count > 0
											? "var(--color-accent)"
											: undefined,
								}}
							>
								{count || ""}
							</div>
						</div>
						<span className={styles.histLabel}>{rating}</span>
					</div>
				);
			})}
		</div>
	);
}
