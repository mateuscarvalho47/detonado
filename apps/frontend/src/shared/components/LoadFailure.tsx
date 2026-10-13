import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";
import styles from "./Shared.module.css";
export function LoadFailure({
	onRetry,
	title = "Não foi possível carregar",
	body = "A requisição falhou. Tente de novo.",
	compact = false,
}: {
	onRetry: () => void;
	title?: string;
	body?: string;
	compact?: boolean;
}) {
	const retry = (
		<Button type="button" variant="accent" size="sm" onClick={onRetry}>
			Tentar de novo
		</Button>
	);
	if (compact)
		return (
			<div className={styles.compactFailure}>
				<div>
					<p className={styles.compactTitle}>{title}</p>
					<p className={styles.compactBody}>{body}</p>
				</div>
				{retry}
			</div>
		);
	return (
		<EmptyState
			icon={<AlertTriangle />}
			title={title}
			body={body}
			action={retry}
		/>
	);
}
