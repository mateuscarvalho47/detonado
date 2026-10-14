import { describe, expect, it, vi } from 'vitest';
import { readLibraryStats } from '@/modules/library/library.stats.js';

const EMPTY_STATS = {
  totalGames: 0,
  totalHoursAgg: { _sum: { hoursPlayed: null } },
  statusGroups: [],
  ratingGroups: [],
  topGenres: [],
  topPlatforms: [],
  completedTimeline: [],
};

const FULL_STATS = {
  totalGames: 3,
  totalHoursAgg: { _sum: { hoursPlayed: '42.5' } },
  statusGroups: [
    { status: 'COMPLETED' as const, _count: { status: 2 } },
    { status: 'PLAYING' as const, _count: { status: 1 } },
  ],
  ratingGroups: [
    { rating: 8, _count: { rating: 1 } },
    { rating: 10, _count: { rating: 1 } },
  ],
  topGenres: [
    { genre: 'RPG', count: 2n },
    { genre: 'Action', count: 1n },
  ],
  topPlatforms: [
    { platform: 'PC', count: 2n },
    { platform: 'PS5', count: 1n },
  ],
  completedTimeline: [
    { month: '2025-04', count: 1n },
    { month: '2025-05', count: 1n },
  ],
};

function readStats(raw: typeof EMPTY_STATS | typeof FULL_STATS) {
  const db = {
    libraryEntry: {
      count: vi.fn().mockResolvedValue(raw.totalGames),
      aggregate: vi.fn().mockResolvedValue(raw.totalHoursAgg),
      groupBy: vi
        .fn()
        .mockResolvedValueOnce(raw.statusGroups)
        .mockResolvedValueOnce(raw.ratingGroups),
    },
    $queryRaw: vi
      .fn()
      .mockResolvedValueOnce(raw.topGenres)
      .mockResolvedValueOnce(raw.topPlatforms)
      .mockResolvedValueOnce(raw.completedTimeline),
  };
  return readLibraryStats(db as never, 'user-1');
}

describe('readLibraryStats', () => {
  it('returns zeros and empty arrays for an empty library', async () => {
    const stats = await readStats(EMPTY_STATS);

    expect(stats.totalGames).toBe(0);
    expect(stats.totalHours).toBe(0);
    expect(stats.topGenres).toEqual([]);
    expect(stats.topPlatforms).toEqual([]);
    expect(stats.ratingDistribution).toEqual([]);
    expect(stats.completedTimeline).toEqual([]);
  });

  it('fills countByStatus with 0 for statuses absent from the library', async () => {
    const stats = await readStats(EMPTY_STATS);

    expect(stats.countByStatus).toEqual({
      WISHLIST: 0,
      BACKLOG: 0,
      PLAYING: 0,
      PAUSED: 0,
      COMPLETED: 0,
      DROPPED: 0,
    });
  });

  it('maps statusGroups correctly and keeps absent statuses at 0', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.countByStatus.COMPLETED).toBe(2);
    expect(stats.countByStatus.PLAYING).toBe(1);
    expect(stats.countByStatus.WISHLIST).toBe(0);
    expect(stats.countByStatus.BACKLOG).toBe(0);
  });

  it('converts totalHours from Decimal string to number', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.totalHours).toBe(42.5);
  });

  it('converts BigInt counts to number in topGenres and topPlatforms', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.topGenres).toEqual([
      { genre: 'RPG', count: 2 },
      { genre: 'Action', count: 1 },
    ]);
    expect(stats.topPlatforms).toEqual([
      { platform: 'PC', count: 2 },
      { platform: 'PS5', count: 1 },
    ]);
  });

  it('converts BigInt counts in completedTimeline', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.completedTimeline).toEqual([
      { month: '2025-04', count: 1 },
      { month: '2025-05', count: 1 },
    ]);
  });

  it('maps ratingDistribution from groupBy result', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.ratingDistribution).toEqual([
      { rating: 8, count: 1 },
      { rating: 10, count: 1 },
    ]);
  });

  it('returns totalGames from repo count', async () => {
    const stats = await readStats(FULL_STATS);

    expect(stats.totalGames).toBe(3);
  });
});
