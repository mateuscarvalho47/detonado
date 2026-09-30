import type { ReactNode } from "react";

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	body: string;
	action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-start gap-3 px-5 py-10 bg-bg-1 border border-border-soft">
			<div className="text-text-lo">{icon}</div>
			<p className="text-title font-semibold text-text-hi m-0">{title}</p>
			<p className="text-text-md text-body max-w-[42ch] m-0">{body}</p>
			{action}
		</div>
	);
}
