import { PageHeader } from "@/components/PageHeader";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { useStats } from "../hooks/useStats";
import { DonutChart } from "./DonutChart";
import { HBars } from "./HBars";
import { Histogram } from "./Histogram";
import { TimelineChart } from "./TimelineChart";

function Card({
	children,
	title,
	sub,
}: {
	children: React.ReactNode;
	title?: string;
	sub?: React.ReactNode;
}) {
	return (
		<div className="bg-bg-1 border border-border-soft rounded-lg p-5.5">
			{(title || sub) && (
				<div className="flex items-start justify-between gap-4 mb-4.5">
					{title && (
						<div className="text-[15.5px] font-semibold tracking-tight text-text-hi">
							{title}
						</div>
					)}
					{sub && <div className="mono-label">{sub}</div>}
				</div>
			)}
			{children}
		</div>
	);
}

export function StatsScreen() {
	const { setOpen } = useSearchModal();
	const { data: stats, isLoading, isError, refetch } = useStats();

	if (isLoading) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7">
				<div className="flex flex-col gap-5">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-50 bg-bg-1 rounded-lg animate-pulse" />
					))}
				</div>
			</div>
		);
	}

	if (isError || !stats) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
				<div className="flex items-end justify-between gap-6 pb-5.5 mb-5.5 border-b border-border-soft">
					<PageHeader
						overline="Análise"
						title="Estatísticas"
						subtitle="Insights da sua biblioteca"
					/>
				</div>
				<LoadFailure onRetry={() => void refetch()} />
			</div>
		);
	}

	if (stats.totalGames === 0) {
		return (
			<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
				<div className="flex items-end justify-between gap-6 pb-5.5 mb-5.5 border-b border-border-soft">
					<PageHeader
						overline="Análise"
						title="Estatísticas"
						subtitle="Insights da sua biblioteca"
					/>
				</div>
				<ArchiveEmpty onAdd={() => setOpen(true)} />
			</div>
		);
	}

	return (
		<div className="px-4 pt-6 lg:px-6 lg:pt-7 pb-15">
			{/* Topbar */}
			<div className="flex items-end justify-between gap-6 pb-5.5 mb-5.5 border-b border-border-soft">
				<PageHeader
					overline="Análise"
					title="Estatísticas"
					subtitle="Insights da sua biblioteca"
				/>
			</div>

			<div className="flex flex-col gap-5">
				{/* Big numbers */}
				<div className="grid grid-cols-2 md:grid-cols-4 bg-bg-1 border border-border-soft rounded-lg overflow-hidden">
					{[
						{ label: "Total de jogos", value: stats.totalGames, unit: "" },
						{
							label: "Horas registradas",
							value: Math.round(stats.totalHours),
							unit: "h",
						},
						{
							label: "Jogos completos",
							value: stats.countByStatus.COMPLETED ?? 0,
							unit: "",
						},
						{
							label: "Na wishlist",
							value: stats.countByStatus.WISHLIST ?? 0,
							unit: "",
						},
					].map((b, i) => (
						<div
							key={b.label}
							className={[
								"flex flex-col gap-2.5 p-5 md:p-6.5 border-border-soft",
								i % 2 === 0 ? "border-r" : "",
								i < 2 ? "border-b md:border-b-0" : "",
								i < 3 ? "md:border-r" : "",
							].join(" ")}
						>
							<div className="mono-label">{b.label}</div>
							<div className="flex items-baseline gap-1.5">
								<span
									className="text-[37px] md:text-[49px] font-bold leading-none text-text-hi"
									style={{ letterSpacing: "-0.04em" }}
								>
									{b.value}
								</span>
								{b.unit && (
									<span className="text-[19px] md:text-[21px] font-medium text-text-lo font-mono">
										{b.unit}
									</span>
								)}
							</div>
						</div>
					))}
				</div>

				{/* Status donut + genre bars */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					<Card title="Por status">
						<DonutChart stats={stats} />
					</Card>
					<Card title="Top gêneros">
						<HBars
							items={stats.topGenres.map((g) => ({
								label: g.genre,
								count: g.count,
							}))}
							color="oklch(0.51 0.22 17)"
						/>
					</Card>
				</div>

				{/* Platform bars + rating histogram */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
					<Card title="Top plataformas">
						<HBars
							items={stats.topPlatforms.map((p) => ({
								label: p.platform,
								count: p.count,
							}))}
							color="oklch(0.58 0.25 17)"
						/>
					</Card>
					<Card title="Distribuição de avaliações" sub="nota 0–10">
						<Histogram distribution={stats.ratingDistribution} />
					</Card>
				</div>

				{/* Timeline */}
				<Card title="Jogos completados por mês">
					<TimelineChart timeline={stats.completedTimeline} />
				</Card>
			</div>
		</div>
	);
}
