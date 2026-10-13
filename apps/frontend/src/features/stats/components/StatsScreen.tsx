import { PageHeader } from "@/components/PageHeader";
import { ArchiveEmpty } from "@/shared/components/ArchiveEmpty";
import { LoadFailure } from "@/shared/components/LoadFailure";
import { useSearchModal } from "@/shared/hooks/useSearchModal";
import { useStats } from "../hooks/useStats";
import { DonutChart } from "./DonutChart";
import { HBars } from "./HBars";
import { Histogram } from "./Histogram";
import styles from "./Stats.module.css";
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
		<section className={styles.card}>
			{(title || sub) && (
				<div className={styles.cardHead}>
					{title && <h2 className={styles.cardTitle}>{title}</h2>}
					{sub && <div className={styles.label}>{sub}</div>}
				</div>
			)}
			{children}
		</section>
	);
}
export function StatsScreen() {
	const { setOpen } = useSearchModal();
	const { data: stats, isLoading, isError, refetch } = useStats();
	if (isLoading)
		return (
			<div className={styles.page}>
				<div className={styles.stack}>
					{[1, 2, 3].map((item) => (
						<div key={item} className={styles.skeleton} />
					))}
				</div>
			</div>
		);
	if (isError || !stats)
		return (
			<div className={styles.page}>
				<div className={styles.top}>
					<PageHeader
						overline="Seu histórico"
						title="Retrospecto"
						subtitle="O que sua biblioteca conta sobre seu jeito de jogar."
					/>
				</div>
				<div className={styles.stack}>
					<LoadFailure onRetry={() => void refetch()} />
				</div>
			</div>
		);
	if (stats.totalGames === 0)
		return (
			<div className={styles.page}>
				<div className={styles.top}>
					<PageHeader
						overline="Seu histórico"
						title="Retrospecto"
						subtitle="Os padrões aparecem conforme sua biblioteca cresce."
					/>
				</div>
				<div className={styles.stack}>
					<ArchiveEmpty onAdd={() => setOpen(true)} />
				</div>
			</div>
		);
	const metrics = [
		{ label: "Jogos guardados", value: stats.totalGames, unit: "" },
		{
			label: "Horas registradas",
			value: Math.round(stats.totalHours),
			unit: "h",
		},
		{
			label: "Concluídos",
			value: stats.countByStatus.COMPLETED ?? 0,
			unit: "",
		},
		{
			label: "Na lista de desejos",
			value: stats.countByStatus.WISHLIST ?? 0,
			unit: "",
		},
	];
	return (
		<div className={styles.page}>
			<div className={styles.top}>
				<PageHeader
					overline="Seu histórico"
					title="Retrospecto"
					subtitle="Uma leitura simples do que você joga e termina."
				/>
			</div>
			<div className={styles.stack}>
				<div className={styles.metrics}>
					{metrics.map((metric) => (
						<div key={metric.label} className={styles.metric}>
							<div className={styles.label}>{metric.label}</div>
							<div className={styles.value}>
								{metric.value}
								{metric.unit && <small>{metric.unit}</small>}
							</div>
						</div>
					))}
				</div>
				<div className={styles.columns}>
					<Card title="Por status">
						<DonutChart stats={stats} />
					</Card>
					<Card title="Gêneros mais presentes">
						<HBars
							items={stats.topGenres.map((item) => ({
								label: item.genre,
								count: item.count,
							}))}
						/>
					</Card>
				</div>
				<div className={styles.columns}>
					<Card title="Plataformas">
						<HBars
							items={stats.topPlatforms.map((item) => ({
								label: item.platform,
								count: item.count,
							}))}
							color="var(--color-lime)"
						/>
					</Card>
					<Card title="Suas avaliações" sub="nota 0–10">
						<Histogram distribution={stats.ratingDistribution} />
					</Card>
				</div>
				<Card title="Jogos concluídos por mês">
					<TimelineChart timeline={stats.completedTimeline} />
				</Card>
			</div>
		</div>
	);
}
