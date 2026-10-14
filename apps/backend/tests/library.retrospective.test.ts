import { retrospectiveQuerySchema } from '@detonado/shared';
import { describe, expect, it, vi } from 'vitest';
import { RetrospectiveService } from '@/modules/library/library.retrospective.service.js';

describe('period retrospective', () => {
  it('fills leap days and compares January with December of the previous year', async () => {
    const repository = {
      getPeriodStats: vi.fn().mockResolvedValue({
        sessions: 0,
        minutes: 0,
        playedGames: 0,
        completedCampaigns: 0,
        series: [],
      }),
    };
    const service = new RetrospectiveService(repository);
    const february = await service.get('owner', { year: 2024, month: 2 });
    expect(february.series).toHaveLength(29);
    expect(february.series[28].date).toBe('2024-02-29');
    const january = await service.get('owner', { year: 2025, month: 1 });
    expect(january.previous.period).toEqual({
      year: 2024,
      month: 12,
      startDate: '2024-12-01',
      endDateExclusive: '2025-01-01',
    });
    const year = await service.get('owner', { year: 2025 });
    expect(year.series).toHaveLength(12);
    expect(year.previous.period.year).toBe(2024);
    expect(year.untrackedHoursExcluded).toBe(true);
  });
  it('rejects invalid query years and months', () => {
    for (const value of [
      { year: 1969 },
      { year: 2101 },
      { year: 2026, month: 0 },
      { year: 2026, month: 13 },
      { year: 'invalid' },
    ])
      expect(retrospectiveQuerySchema.safeParse(value).success).toBe(false);
    expect(retrospectiveQuerySchema.parse({ year: '2026', month: '10' })).toEqual({
      year: 2026,
      month: 10,
    });
  });
});
