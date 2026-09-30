import { STATUS_BY_KEY } from "@/shared/constants/statuses";
import type { GameStatus } from "@/types/api";

interface StatusBadgeProps {
	status: GameStatus;
	size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
	const def = STATUS_BY_KEY[status];
	return (
		<span
			className={
				size === "sm"
					? "inline-flex items-center gap-1.5 text-caption text-text-hi whitespace-nowrap"
					: "inline-flex items-center gap-1.5 text-body text-text-hi whitespace-nowrap"
			}
		>
			<span
				aria-hidden
				className="w-0.5 h-3 shrink-0"
				style={{ background: def.color }}
			/>
			{def.label}
		</span>
	);
}
