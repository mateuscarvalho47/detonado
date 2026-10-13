import type { ReactNode } from "react";
import styles from "./Shared.module.css";
export function EmptyState({
	icon,
	title,
	body,
	action,
}: {
	icon: ReactNode;
	title: string;
	body: string;
	action?: ReactNode;
}) {
	return (
		<div className={styles.empty}>
			<div className={styles.emptyIcon}>{icon}</div>
			<p className={styles.emptyTitle}>{title}</p>
			<p className={styles.emptyBody}>{body}</p>
			{action}
		</div>
	);
}
