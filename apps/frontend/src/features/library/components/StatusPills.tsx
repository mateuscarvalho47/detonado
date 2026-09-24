import { useMemo } from "react";
import { statusColor } from "@/lib/statusColor";
import { cn } from "@/lib/utils";
import { STATUSES } from "@/shared/constants/statuses";
import type { GameStatus, LibraryEntry } from "@/types/api";

interface StatusPillsProps {
	library: LibraryEntry[];
	active: GameStatus | null;
	onChange: (s: GameStatus | null) => void;
}

export function StatusPills({ library, active, onChange }: StatusPillsProps) {
	const total = library.length;
	const countByStatus = useMemo(() => {
		const counts = {} as Record<GameStatus, number>;
		for (const g of library) counts[g.status] = (counts[g.status] ?? 0) + 1;
		return counts;
	}, [library]);

	return (
		<div className="flex gap-1 flex-wrap">
			<button
				type="button"
				onClick={() => onChange(null)}
				className={cn(
					"inline-flex items-center gap-1.5 h-8 min-h-11 lg:min-h-0 px-3 rounded-full text-body font-medium cursor-pointer transition-all border",
					active === null
						? "text-text-hi border-border-strong bg-bg-3/50"
						: "text-text-md border-border-soft bg-bg-1",
				)}
			>
				Todos
				<span
					className={cn(
						"text-overline pl-1.5 ml-0.5 border-l border-border-soft",
						active === null ? "text-text-md" : "text-text-lo",
					)}
				>
					{total}
				</span>
			</button>

			{STATUSES.map((s) => {
				const count = countByStatus[s.key] ?? 0;
				const isActive = active === s.key;
				return (
					<button
						type="button"
						key={s.key}
						onClick={() => onChange(isActive ? null : s.key)}
						className={cn(
							"inline-flex items-center gap-1.5 h-8 min-h-11 lg:min-h-0 px-3 rounded-full text-body font-medium cursor-pointer transition-all border",
							isActive
								? "border-transparent"
								: "text-text-md border-border-soft bg-bg-1",
						)}
						style={
							isActive
								? {
										background: statusColor(s.hue, "bgPill"),
										borderColor: statusColor(s.hue, "borderPill"),
										color: "oklch(0.96 0.006 75)",
									}
								: undefined
						}
					>
						{s.label}
						<span className="text-overline pl-1.5 ml-0.5 border-l border-border-soft text-text-lo">
							{count}
						</span>
					</button>
				);
			})}
		</div>
	);
}
