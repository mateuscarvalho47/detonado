import { STATUSES } from "@/shared/constants/statuses";
import type { LibraryStats } from "@/types/api";

interface DonutChartProps {
	stats: LibraryStats;
}

export function DonutChart({ stats }: DonutChartProps) {
	const total = stats.totalGames || 1;
	const r = 80;
	const cx = 110;
	const cy = 110;
	const circumference = 2 * Math.PI * r;

	let offset = 0;
	const segments = STATUSES.map((s) => {
		const count = stats.countByStatus[s.key] ?? 0;
		const pct = count / total;
		const dash = pct * circumference;
		const gap = circumference - dash;
		const seg = {
			key: s.key,
			label: s.label,
			count,
			color: s.color,
			dash,
			gap,
			offset,
		};
		offset += dash;
		return seg;
	}).filter((s) => s.count > 0);

	return (
		<div className="flex flex-col items-center gap-6 sm:grid sm:grid-cols-[220px_1fr] sm:items-center sm:gap-7">
			<div className="relative size-55">
				<svg
					role="img"
					aria-label="Distribuição de jogos por status"
					width="220"
					height="220"
					viewBox="0 0 220 220"
				>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke="var(--color-border)"
						strokeWidth={20}
					/>
					{segments.map((seg) => (
						<circle
							key={seg.key}
							cx={cx}
							cy={cy}
							r={r}
							fill="none"
							stroke={seg.color}
							strokeWidth={20}
							strokeDasharray={`${seg.dash} ${seg.gap}`}
							strokeDashoffset={-seg.offset}
							transform={`rotate(-90 ${cx} ${cy})`}
							style={{ transition: "stroke-dasharray 0.6s ease-out" }}
						/>
					))}
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-3xl font-semibold tabular-nums text-text-hi leading-none">
						{stats.totalGames}
					</span>
					<span className="mono-label mt-1">jogos</span>
				</div>
			</div>

			<ul className="list-none m-0 p-0 flex flex-col gap-2">
				{STATUSES.map((s) => {
					const count = stats.countByStatus[s.key] ?? 0;
					const pct = (count / total) * 100;
					return (
						<li
							key={s.key}
							className="grid gap-2.5 items-center text-body"
							style={{ gridTemplateColumns: "12px 80px 1fr 28px" }}
						>
							<div className="w-0.5 h-3" style={{ background: s.color }} />
							<span className="text-text-md">{s.label}</span>
							<div className="h-1.5 bg-bg-2 overflow-hidden">
								<div
									className="h-full transition-[width] duration-700 ease-out"
									style={{ width: `${pct}%`, background: s.color }}
								/>
							</div>
							<span className="text-text-hi text-right">{count}</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
