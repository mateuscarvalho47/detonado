import type {
  RetrospectivePeriod,
  RetrospectiveQuery,
  RetrospectiveResponse,
} from '@detonado/shared';
import { LIBRARY_TIME_ZONE } from './library.dates.js';
import type { LibraryRepository } from './library.repository.js';

export function describePeriod(year: number, month: number | null): RetrospectivePeriod {
  const start = new Date(Date.UTC(year, month === null ? 0 : month - 1, 1));
  const end = new Date(Date.UTC(month === null ? year + 1 : year, month === null ? 0 : month, 1));
  return {
    year,
    month,
    startDate: start.toISOString().slice(0, 10),
    endDateExclusive: end.toISOString().slice(0, 10),
  };
}
export class RetrospectiveService {
  constructor(private readonly repository: Pick<LibraryRepository, 'getPeriodStats'>) {}
  async get(userId: string, query: RetrospectiveQuery): Promise<RetrospectiveResponse> {
    const period = describePeriod(query.year, query.month ?? null);
    const previousPeriod =
      query.month === undefined
        ? describePeriod(query.year - 1, null)
        : query.month === 1
          ? describePeriod(query.year - 1, 12)
          : describePeriod(query.year, query.month - 1);
    const current = await this.repository.getPeriodStats(userId, period);
    const previous = await this.repository.getPeriodStats(userId, previousPeriod);
    const points = new Map(current.series.map((point) => [point.date, point]));
    const length =
      period.month === null ? 12 : new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
    const series = Array.from({ length }, (_, index) => {
      const date =
        period.month === null
          ? `${period.year}-${String(index + 1).padStart(2, '0')}`
          : `${period.startDate.slice(0, 7)}-${String(index + 1).padStart(2, '0')}`;
      return points.get(date) ?? { date, sessions: 0, minutes: 0, completedCampaigns: 0 };
    });
    const { series: _currentSeries, ...stats } = current;
    const { series: _previousSeries, ...previousStats } = previous;
    return {
      timeZone: LIBRARY_TIME_ZONE,
      period,
      current: stats,
      previous: { period: previousPeriod, stats: previousStats },
      series,
      untrackedHoursExcluded: true as const,
    };
  }
}
