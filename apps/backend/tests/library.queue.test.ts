import { describe, expect, it } from 'vitest';
import { compareQueuePosition, reorderIds } from '@/modules/library/library.queue.js';
import { LibraryRepository } from '@/modules/library/library.repository.js';

describe('reorderIds', () => {
  it('swaps with the neighbor and refuses the ends', () => {
    expect(reorderIds(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
    expect(reorderIds(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
    expect(reorderIds(['a', 'b', 'c'], 'a', 'up')).toBeNull();
    expect(reorderIds(['a', 'b', 'c'], 'c', 'down')).toBeNull();
    expect(reorderIds(['a', 'b'], 'missing', 'up')).toBeNull();
  });
});

describe('compareQueuePosition', () => {
  it('puts a missing position after a numbered one, then breaks ties by time', () => {
    const older = { queuePosition: 1, createdAt: new Date('2024-01-01') };
    const newer = { queuePosition: 1, createdAt: new Date('2024-02-01') };
    const unnumbered = { queuePosition: null, createdAt: new Date('2020-01-01') };
    expect(compareQueuePosition(older, newer)).toBeLessThan(0);
    expect(compareQueuePosition(unnumbered, older)).toBeGreaterThan(0);
  });
});

type Row = {
  id: string;
  userId: string;
  status: 'BACKLOG' | 'PLAYING';
  queuePosition: number | null;
  createdAt: Date;
};

function fakeDb(rows: Row[]) {
  const table = rows.map((row) => ({ ...row }));
  const libraryEntry = {
    findMany: async ({ where }: { where: { userId: string; status: string } }) =>
      table
        .filter((row) => row.userId === where.userId && row.status === where.status)
        .map((row) => ({ ...row })),
    update: async ({ where, data }: { where: { id: string }; data: { queuePosition: number } }) => {
      const row = table.find((item) => item.id === where.id);
      if (!row) throw new Error('missing');
      row.queuePosition = data.queuePosition;
      return { ...row };
    },
    findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
      table.find((row) => row.id === where.id && row.userId === where.userId) ?? null,
    aggregate: async ({ where }: { where: { userId: string; status: string } }) => {
      const positions = table
        .filter((row) => row.userId === where.userId && row.status === where.status)
        .map((row) => row.queuePosition)
        .filter((position): position is number => position != null);
      return { _max: { queuePosition: positions.length ? Math.max(...positions) : null } };
    },
  };
  return {
    table,
    db: {
      libraryEntry,
      $transaction: async <T>(fn: (tx: { libraryEntry: typeof libraryEntry }) => Promise<T>) =>
        fn({ libraryEntry }),
    },
  };
}

describe('LibraryRepository queue', () => {
  it('moves one step and leaves the ends alone', async () => {
    const { db, table } = fakeDb([
      {
        id: 'a',
        userId: 'user-1',
        status: 'BACKLOG',
        queuePosition: 1,
        createdAt: new Date('2024-01-03'),
      },
      {
        id: 'b',
        userId: 'user-1',
        status: 'BACKLOG',
        queuePosition: 2,
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'c',
        userId: 'user-1',
        status: 'BACKLOG',
        queuePosition: 3,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'other',
        userId: 'user-2',
        status: 'BACKLOG',
        queuePosition: 1,
        createdAt: new Date('2024-01-01'),
      },
    ]);
    const repo = new LibraryRepository(db as never);

    await repo.moveInQueue('user-1', 'b', 'up');
    expect(table.find((row) => row.id === 'b')?.queuePosition).toBe(1);
    expect(table.find((row) => row.id === 'a')?.queuePosition).toBe(2);
    expect(table.find((row) => row.id === 'c')?.queuePosition).toBe(3);
    expect(table.find((row) => row.id === 'other')?.queuePosition).toBe(1);

    await repo.moveInQueue('user-1', 'b', 'up');
    expect(table.find((row) => row.id === 'b')?.queuePosition).toBe(1);
  });

  it('gives the next add the position after the last', async () => {
    const { db } = fakeDb([
      {
        id: 'a',
        userId: 'user-1',
        status: 'BACKLOG',
        queuePosition: 1,
        createdAt: new Date('2024-01-02'),
      },
      {
        id: 'b',
        userId: 'user-1',
        status: 'PLAYING',
        queuePosition: null,
        createdAt: new Date('2024-01-03'),
      },
    ]);
    const repo = new LibraryRepository(db as never);
    await expect(repo.nextQueuePosition('user-1')).resolves.toBe(2);
  });
});
