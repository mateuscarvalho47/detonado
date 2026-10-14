import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
	fetchRetrospective,
	type Retrospective,
} from "../service/retrospectiveService";
import { PeriodRetrospective } from "./PeriodRetrospective";

vi.mock("../service/retrospectiveService", () => ({
	fetchRetrospective: vi.fn(),
}));
const EMPTY = {
	sessions: 0,
	minutes: 0,
	playedGames: 0,
	completedCampaigns: 0,
};
function report(year: number, month?: number): Retrospective {
	return {
		timeZone: "America/Sao_Paulo",
		period: {
			year,
			month: month ?? null,
			startDate: `${year}-01-01`,
			endDateExclusive: `${year + 1}-01-01`,
		},
		current: EMPTY,
		previous: {
			period: {
				year: year - 1,
				month: null,
				startDate: `${year - 1}-01-01`,
				endDateExclusive: `${year}-01-01`,
			},
			stats: EMPTY,
		},
		series: [
			{
				date: month
					? `${year}-${String(month).padStart(2, "0")}-01`
					: `${year}-01`,
				sessions: 0,
				minutes: 0,
				completedCampaigns: 0,
			},
		],
		untrackedHoursExcluded: true,
	};
}
beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(fetchRetrospective).mockImplementation(async (year, month) =>
		report(year, month),
	);
});
it("switches annual/monthly periods with separate cached queries and explains timezone and excluded hours", async () => {
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={qc}>
			<PeriodRetrospective />
		</QueryClientProvider>,
	);
	await waitFor(() =>
		expect(
			screen.getByText("Nenhuma sessão ou conclusão registrada neste período."),
		).toBeInTheDocument(),
	);
	expect(screen.getByText(/Fuso: America\/Sao_Paulo/)).toBeInTheDocument();
	expect(
		screen.getByText(/manuais sem sessão datada ficam fora/),
	).toBeInTheDocument();
	expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
	const initialYear = new Date().getFullYear();
	expect(qc.getQueryData(["retrospective", initialYear, null])).toMatchObject({
		period: { year: initialYear, month: null },
	});
	fireEvent.change(screen.getByLabelText("Ano"), { target: { value: "2024" } });
	fireEvent.change(screen.getByLabelText("Mês"), { target: { value: "2" } });
	fireEvent.click(screen.getByRole("button", { name: "Ver período" }));
	await waitFor(() =>
		expect(
			screen.getByRole("heading", { name: "Fevereiro de 2024" }),
		).toBeInTheDocument(),
	);
	expect(fetchRetrospective).toHaveBeenCalledWith(2024, 2);
	expect(qc.getQueryData(["retrospective", 2024, 2])).toMatchObject({
		period: { month: 2 },
	});
	expect(screen.getByText("01/02/2024")).toBeInTheDocument();
	expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
});
it("shows absolute comparisons when the previous period is zero", async () => {
	vi.mocked(fetchRetrospective).mockResolvedValue({
		...report(2026),
		current: {
			sessions: 2,
			minutes: 90,
			playedGames: 1,
			completedCampaigns: 1,
		},
	});
	const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={qc}>
			<PeriodRetrospective />
		</QueryClientProvider>,
	);
	await waitFor(() => expect(screen.getByText("1,5h")).toBeInTheDocument());
	expect(
		screen.getByText("+1,5h em relação ao período anterior (0h)."),
	).toBeInTheDocument();
	expect(
		screen.getByText("90 minutos registrados em sessões neste período."),
	).toBeInTheDocument();
	expect(screen.queryByText(/Infinity|NaN|%/)).not.toBeInTheDocument();
});
