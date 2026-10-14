import type { RetrospectivePeriod } from "../service/retrospectiveService";
export const MONTH_NAMES = [
	"Janeiro",
	"Fevereiro",
	"Março",
	"Abril",
	"Maio",
	"Junho",
	"Julho",
	"Agosto",
	"Setembro",
	"Outubro",
	"Novembro",
	"Dezembro",
];
export function periodLabel(
	period: Pick<RetrospectivePeriod, "year" | "month">,
) {
	return period.month
		? `${MONTH_NAMES[period.month - 1]} de ${period.year}`
		: String(period.year);
}
export function calendarLabel(value: string) {
	const [year, month, day] = value.split("-");
	return day
		? `${day}/${month}/${year}`
		: `${MONTH_NAMES[Number(month) - 1]} de ${year}`;
}
export function numericLabel(value: number) {
	return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
export function deltaLabel(value: number) {
	const rounded = Math.round(value * 100) / 100;
	const normalized = rounded === 0 ? 0 : rounded;
	return `${normalized > 0 ? "+" : ""}${numericLabel(normalized)}`;
}
