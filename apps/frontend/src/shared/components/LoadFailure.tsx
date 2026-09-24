import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./EmptyState";

interface LoadFailureProps {
	onRetry: () => void;
	title?: string;
	body?: string;
	compact?: boolean;
}

export function LoadFailure({
	onRetry,
	title = "Não foi possível carregar",
	body = "A requisição falhou. Tente de novo.",
	compact = false,
}: LoadFailureProps) {
	const retry = (
		<Button
			type="button"
			variant="accent"
			size="sm"
			onClick={onRetry}
			className="rounded-lg"
		>
			Tentar de novo
		</Button>
	);

	if (compact) {
		return (
			<div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-bg-1 border border-border-soft rounded-lg">
				<div className="min-w-0">
					<p className="text-body font-medium text-text-hi m-0">{title}</p>
					<p className="text-caption text-text-md m-0 mt-1">{body}</p>
				</div>
				{retry}
			</div>
		);
	}

	return (
		<EmptyState
			icon={<AlertTriangle className="size-7" />}
			title={title}
			body={body}
			action={retry}
		/>
	);
}
