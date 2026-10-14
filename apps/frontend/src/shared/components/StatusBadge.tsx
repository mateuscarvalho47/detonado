import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { GameStatus } from "@/types/api";
import styles from "./Shared.module.css";
export function StatusBadge({
	status,
	size = "md",
}: {
	status: GameStatus;
	size?: "sm" | "md";
}) {
	const definition = STATUS_BY_KEY[status];
	return (
		<span
			className={styles.status}
			data-size={size}
			style={{ "--status-color": definition.color } as React.CSSProperties}
		>
			<span aria-hidden className={styles.statusMark} />
			{definition.label}
		</span>
	);
}
