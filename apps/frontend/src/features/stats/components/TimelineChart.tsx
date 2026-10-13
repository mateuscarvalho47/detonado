import type { LibraryStats } from "@/types/api";
import styles from "./Stats.module.css";
export function TimelineChart({
	timeline,
}: {
	timeline: LibraryStats["completedTimeline"];
}) {
	if (timeline.length < 2)
		return (
			<div className={styles.chartEmpty}>
				Complete mais jogos para ver sua linha do tempo.
			</div>
		);
	const width = 800,
		height = 160,
		pad = { top: 10, right: 20, bottom: 30, left: 30 };
	const innerWidth = width - pad.left - pad.right,
		innerHeight = height - pad.top - pad.bottom,
		max = Math.max(...timeline.map((item) => item.count), 1);
	const points = timeline.map((item, index) => ({
		x: pad.left + (index / (timeline.length - 1)) * innerWidth,
		y: pad.top + innerHeight - (item.count / max) * innerHeight,
		...item,
	}));
	const path = points
		.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
		.join(" ");
	return (
		<div className={styles.timeline}>
			<svg
				role="img"
				aria-label="Jogos concluídos ao longo do tempo"
				width="100%"
				height="100%"
				viewBox={`0 0 ${width} ${height}`}
			>
				<path
					d={`${path} L ${points.at(-1)?.x} ${height - pad.bottom} L ${points[0].x} ${height - pad.bottom} Z`}
					fill="color-mix(in oklab, var(--color-accent) 12%, transparent)"
				/>
				<path
					d={path}
					fill="none"
					stroke="var(--color-accent)"
					strokeWidth="2"
				/>
				{points.map((point) => (
					<circle
						key={point.month}
						cx={point.x}
						cy={point.y}
						r="4"
						fill="var(--color-accent)"
					/>
				))}
				{points
					.filter((_, index) => index % Math.ceil(points.length / 8) === 0)
					.map((point) => (
						<text
							key={point.month}
							x={point.x}
							y={height - 8}
							textAnchor="middle"
							fontSize="10"
							fill="var(--color-ink-faint)"
							fontFamily="var(--font-mono)"
						>
							{point.month.slice(5)}
						</text>
					))}
			</svg>
		</div>
	);
}
