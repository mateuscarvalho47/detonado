import { useMoveInQueue } from "../hooks/useLibrary";
import styles from "./Library.module.css";
export function QueueMoveButtons({
	id,
	name,
	isFirst,
	isLast,
}: {
	id: string;
	name: string;
	isFirst: boolean;
	isLast: boolean;
}) {
	const move = useMoveInQueue();
	const pending = move.isPending && move.variables?.id === id;
	return (
		<div className={styles.queueButtons}>
			<button
				type="button"
				aria-label={`Subir ${name}`}
				disabled={isFirst || pending}
				onClick={() => move.mutate({ id, direction: "up" })}
				className={styles.queueButton}
			>
				↑
			</button>
			<button
				type="button"
				aria-label={`Descer ${name}`}
				disabled={isLast || pending}
				onClick={() => move.mutate({ id, direction: "down" })}
				className={styles.queueButton}
			>
				↓
			</button>
		</div>
	);
}
