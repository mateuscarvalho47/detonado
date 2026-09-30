import type { LibraryStats } from "@/types/api";

interface TimelineChartProps {
	timeline: LibraryStats["completedTimeline"];
}

export function TimelineChart({ timeline }: TimelineChartProps) {
	if (timeline.length < 2) {
		return (
			<div className="h-45 flex items-center justify-center text-text-lo text-sm">
				Dados insuficientes para o gráfico
			</div>
		);
	}

	const W = 800;
	const H = 160;
	const PAD = { top: 10, right: 20, bottom: 30, left: 30 };
	const innerW = W - PAD.left - PAD.right;
	const innerH = H - PAD.top - PAD.bottom;

	const maxCount = Math.max(...timeline.map((d) => d.count), 1);

	const points = timeline.map((d, i) => ({
		x: PAD.left + (i / (timeline.length - 1)) * innerW,
		y: PAD.top + innerH - (d.count / maxCount) * innerH,
		count: d.count,
		month: d.month,
	}));

	const pathD = points
		.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
		.join(" ");
	const areaD = `${pathD} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`;

	return (
		<div className="w-full h-45">
			<svg
				role="img"
				aria-label="Gráfico de jogos completados ao longo do tempo"
				width="100%"
				height="100%"
				viewBox={`0 0 ${W} ${H}`}
				preserveAspectRatio="xMidYMid meet"
			>
				<path d={areaD} fill="oklch(0.78 0.012 80 / 0.12)" />
				<path
					d={pathD}
					fill="none"
					stroke="oklch(0.78 0.012 80)"
					strokeWidth={2}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{points.map((p) => (
					<circle
						key={p.month}
						cx={p.x}
						cy={p.y}
						r={4}
						fill="oklch(0.92 0.012 80)"
					/>
				))}
				{points
					.filter((_, i) => i % Math.ceil(points.length / 8) === 0)
					.map((p) => (
						<text
							key={p.month}
							x={p.x}
							y={H - 8}
							textAnchor="middle"
							fontSize={10}
							fill="var(--color-text-dim)"
							fontFamily="'Geist Mono', monospace"
						>
							{p.month.slice(5)}
						</text>
					))}
				{[0, Math.round(maxCount / 2), maxCount].map((v) => (
					<text
						key={v}
						x={PAD.left - 6}
						y={PAD.top + innerH - (v / maxCount) * innerH + 4}
						textAnchor="end"
						fontSize={10}
						fill="var(--color-text-dim)"
						fontFamily="'Geist Mono', monospace"
					>
						{v}
					</text>
				))}
				{[0.25, 0.5, 0.75, 1].map((frac) => (
					<line
						key={frac}
						x1={PAD.left}
						y1={PAD.top + innerH * (1 - frac)}
						x2={W - PAD.right}
						y2={PAD.top + innerH * (1 - frac)}
						stroke="var(--color-grid-line)"
						strokeWidth={1}
					/>
				))}
			</svg>
		</div>
	);
}
