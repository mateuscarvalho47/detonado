import { formatHours } from "@/shared/lib/formatHours";
import styles from "./Shared.module.css";
export function HltbStat({
	label,
	hours,
}: {
	label: string;
	hours: number | null | undefined;
}) {
	return (
		<div className={styles.hltb}>
			<div className={styles.hltbLabel}>{label}</div>
			<div className={styles.hltbValue}>{formatHours(hours)}</div>
		</div>
	);
}
export function HltbStatSkeleton() {
	return (
		<div className={styles.hltb}>
			<div className={styles.skeletonLabel} />
			<div className={styles.skeletonValue} />
		</div>
	);
}
