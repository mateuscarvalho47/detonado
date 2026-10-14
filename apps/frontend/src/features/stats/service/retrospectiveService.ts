import { api } from "@/lib/api";
export interface RetrospectivePeriod {
	year: number;
	month: number | null;
	startDate: string;
	endDateExclusive: string;
}
export interface RetrospectiveSummary {
	sessions: number;
	minutes: number;
	playedGames: number;
	completedCampaigns: number;
}
export interface Retrospective {
	timeZone: "America/Sao_Paulo";
	period: RetrospectivePeriod;
	current: RetrospectiveSummary;
	previous: { period: RetrospectivePeriod; stats: RetrospectiveSummary };
	series: {
		date: string;
		sessions: number;
		minutes: number;
		completedCampaigns: number;
	}[];
	untrackedHoursExcluded: true;
}
export function fetchRetrospective(year: number, month?: number) {
	return api.get<Retrospective>(
		`/library/retrospective?year=${year}${month ? `&month=${month}` : ""}`,
	);
}
