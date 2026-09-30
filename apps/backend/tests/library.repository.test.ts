import { PROGRESS_STATUSES } from '@detonado/shared';
import { describe, expect, it, vi } from 'vitest';
import { LibraryRepository } from '@/modules/library/library.repository.js';

const PROGRESS = { in: [...PROGRESS_STATUSES] };

function makeDb() {
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
  const findFirst = vi.fn().mockResolvedValue({ id: 'entry-1' });
  const aggregate = vi.fn().mockResolvedValue({ _sum: { hoursPlayed: null } });
  const groupBy = vi.fn().mockResolvedValue([]);
  const db = {
    libraryEntry: {
      updateMany,
      deleteMany,
      findFirst,
      count: vi.fn().mockResolvedValue(0),
      aggregate,
      groupBy,
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  return { db, updateMany, deleteMany, findFirst, aggregate, groupBy };
}

describe('LibraryRepository writes', () => {
  it('updates only the row that belongs to the user', async () => {
    const { db, updateMany, findFirst } = makeDb();
    const repo = new LibraryRepository(db as never);

    const updated = await repo.update('entry-1', 'user-1', { status: 'PLAYING' });

    expect(updated).toEqual({ id: 'entry-1' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      data: { status: 'PLAYING' },
    });
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'entry-1', userId: 'user-1' } });
  });

  it('does not read the row back when the owner filter matches nothing', async () => {
    const { db, updateMany, findFirst } = makeDb();
    updateMany.mockResolvedValueOnce({ count: 0 });
    const repo = new LibraryRepository(db as never);

    await expect(repo.update('entry-1', 'user-2', { status: 'PLAYING' })).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('deletes only the row that belongs to the user', async () => {
    const { db, deleteMany } = makeDb();
    const repo = new LibraryRepository(db as never);

    await expect(repo.delete('entry-1', 'user-1')).resolves.toBe(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'entry-1', userId: 'user-1' } });
  });
});

describe('LibraryRepository.getStats', () => {
  it('sums hours and ratings only for statuses that record progress', async () => {
    const { db, aggregate, groupBy } = makeDb();
    const repo = new LibraryRepository(db as never);

    await repo.getStats('user-1');

    expect(aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: PROGRESS },
      _sum: { hoursPlayed: true },
    });
    expect(groupBy).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        by: ['status'],
        where: { userId: 'user-1' },
      }),
    );
    expect(groupBy).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        by: ['rating'],
        where: { userId: 'user-1', rating: { not: null }, status: PROGRESS },
      }),
    );
  });
});
