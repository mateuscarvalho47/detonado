import type { BacklogHours } from "@/shared/lib/backlogHours";
import {
	backlogHoursLegend,
	formatBacklogHours,
} from "@/shared/lib/backlogHours";
import type { LibraryStats } from "@/types/api";

export type StatsTileStatus = "ready" | "loading" | "error";

interface StatTilesProps {
	stats: LibraryStats | undefined;
	backlog: BacklogHours;
	statsStatus: StatsTileStatus;
}

function tileBorder(i: number): string {
	// mobile: 2-col grid — right border on even, bottom border on top row
	// desktop: 4-col grid — right border except last
	const parts: string[] = [];
	if (i % 2 === 0) parts.push("border-r");
	if (i < 2) parts.push("border-b");
	parts.push("md:border-b-0");
	if (i < 3) parts.push("md:border-r");
	else parts.push("md:border-r-0");
	parts.push("border-border-soft");
	return parts.join(" ");
}

function statNumber(
	status: StatsTileStatus,
	value: number | undefined,
	unit: string,
	sub: string,
): { value: string; unit: string; sub: string; pending: boolean } {
	if (status === "loading") {
		return { value: "", unit: "", sub, pending: true };
	}
	if (status === "error") {
		return { value: "—", unit: "", sub: "indisponível", pending: false };
	}
	return { value: String(value ?? 0), unit, sub, pending: false };
}

export function StatTiles({ stats, backlog, statsStatus }: StatTilesProps) {
	const tiles = [
		{
			label: "Total de jogos",
			...statNumber(statsStatus, stats?.totalGames, "", "na biblioteca"),
			accent: true,
		},
		{
			label: "Horas na fila",
			value: formatBacklogHours(backlog.total),
			unit: "h",
			sub: backlogHoursLegend(backlog),
			pending: false,
			accent: false,
		},
		{
			label: "Completos",
			...statNumber(
				statsStatus,
				stats?.countByStatus.COMPLETED,
				"",
				"jogos finalizados",
			),
			accent: false,
		},
		{
			label: "Jogando agora",
			...statNumber(
				statsStatus,
				stats?.countByStatus.PLAYING,
				"",
				"em andamento",
			),
			accent: false,
		},
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 bg-bg-1 border border-border-soft rounded-lg overflow-hidden">
			{tiles.map((t, i) => (
				<div
					key={t.label}
					className={`flex flex-col gap-2 p-5 px-6 relative ${tileBorder(i)}${t.accent ? " bg-[linear-gradient(180deg,transparent,oklch(0.4_0.1_17/0.12))]" : ""}`}
				>
					{t.accent && (
						<div className="absolute top-0 left-0 right-0 h-0.5 bg-[linear-gradient(90deg,transparent,oklch(0.51_0.22_17),transparent)]" />
					)}
					<div className="mono-label">{t.label}</div>
					<div className="flex items-baseline gap-1">
						{t.pending ? (
							<span className="inline-block h-8 w-16 rounded-md bg-bg-2 animate-pulse" />
						) : (
							<span className="text-2xl md:text-[33px] font-bold tracking-[-0.03em] text-text-hi">
								{t.value}
							</span>
						)}
						{t.unit && (
							<span className="text-heading md:text-[17px] font-medium text-text-lo font-mono">
								{t.unit}
							</span>
						)}
					</div>
					<div className="text-caption text-text-md font-mono">{t.sub}</div>
				</div>
			))}
		</div>
	);
}
