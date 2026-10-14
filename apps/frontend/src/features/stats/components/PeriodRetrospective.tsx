import { Button } from "@/components/ui/button";
import { useRetrospective } from "../hooks/useRetrospective";
import {
	calendarLabel,
	deltaLabel,
	MONTH_NAMES,
	numericLabel,
	periodLabel,
} from "../lib/retrospectiveLabels";
import styles from "./PeriodRetrospective.module.css";
export function PeriodRetrospective() {
	const state = useRetrospective();
	const report = state.query.data;
	const metrics = report
		? [
				{
					label: "Sessões",
					value: report.current.sessions,
					previous: report.previous.stats.sessions,
					unit: "",
				},
				{
					label: "Horas em sessões",
					value: report.current.minutes / 60,
					previous: report.previous.stats.minutes / 60,
					unit: "h",
				},
				{
					label: "Jogos jogados",
					value: report.current.playedGames,
					previous: report.previous.stats.playedGames,
					unit: "",
				},
				{
					label: "Campanhas concluídas",
					value: report.current.completedCampaigns,
					previous: report.previous.stats.completedCampaigns,
					unit: "",
				},
			]
		: [];
	return (
		<section className={styles.panel} aria-labelledby="period-title">
			<h2 id="period-title">Retrospecto por período</h2>
			<form onSubmit={state.onSubmit} className={styles.form}>
				<label>
					Ano
					<input
						type="number"
						min={1970}
						max={2100}
						{...state.form.register("year", { valueAsNumber: true })}
					/>
				</label>
				<label>
					Mês
					<select
						{...state.form.register("month", {
							setValueAs: (value: string) =>
								value === "" ? "" : Number(value),
						})}
					>
						<option value="">Ano todo</option>
						{MONTH_NAMES.map((month, index) => (
							<option key={month} value={index + 1}>
								{month}
							</option>
						))}
					</select>
				</label>
				<Button variant="outline" type="submit">
					Ver período
				</Button>
				{Object.entries(state.form.formState.errors).map(([field, error]) => (
					<p role="alert" key={field}>
						{error.message}
					</p>
				))}
			</form>
			<p>
				Fuso: America/Sao_Paulo. Sessões seguem a data local; conclusões usam a
				data informada no registro.
			</p>
			<p>
				Horas anteriores ou manuais sem sessão datada ficam fora deste
				retrospecto. Os totais da biblioteca completa aparecem abaixo.
			</p>
			{state.query.isFetching && <p role="status">Carregando período…</p>}
			{state.query.isError && (
				<p role="alert">
					{state.query.error.message}{" "}
					<Button variant="ghost" onClick={() => void state.query.refetch()}>
						Tentar novamente
					</Button>
				</p>
			)}
			{report && (
				<div aria-live="polite" className={styles.report}>
					<h3>{periodLabel(report.period)}</h3>
					<p>
						Comparação com {periodLabel(report.previous.period)}. Diferenças em
						valores absolutos.
					</p>
					<div className={styles.metrics}>
						{metrics.map((metric) => (
							<div key={metric.label}>
								<h4>{metric.label}</h4>
								<strong>
									{numericLabel(metric.value)}
									{metric.unit}
								</strong>
								<p>
									{deltaLabel(metric.value - metric.previous)}
									{metric.unit} em relação ao período anterior (
									{numericLabel(metric.previous)}
									{metric.unit}).
								</p>
							</div>
						))}
					</div>
					<p>
						{report.current.minutes} minutos registrados em sessões neste
						período.
					</p>
					{report.current.sessions === 0 &&
						report.current.completedCampaigns === 0 && (
							<p>Nenhuma sessão ou conclusão registrada neste período.</p>
						)}
					<details className={styles.series}>
						<summary>
							{report.period.month ? "Atividade por dia" : "Atividade por mês"}
						</summary>
						<div className={styles.tableWrap}>
							<table>
								<caption>
									Sessões e conclusões em {periodLabel(report.period)}
								</caption>
								<thead>
									<tr>
										<th scope="col">{report.period.month ? "Data" : "Mês"}</th>
										<th scope="col">Sessões</th>
										<th scope="col">Horas em sessões</th>
										<th scope="col">Campanhas concluídas</th>
									</tr>
								</thead>
								<tbody>
									{report.series.map((point) => (
										<tr key={point.date}>
											<th scope="row">{calendarLabel(point.date)}</th>
											<td>{point.sessions}</td>
											<td>{numericLabel(point.minutes / 60)}h</td>
											<td>{point.completedCampaigns}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</div>
			)}
		</section>
	);
}
