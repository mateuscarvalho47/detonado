import { PROGRESS_STATUSES } from '@detonado/shared';
import { describe, expect, it, vi } from 'vitest';
import { LibraryRepository } from '@/modules/library/library.repository.js';

const PROGRESS = { in: [...PROGRESS_STATUSES] };

function makeDb() {
  const updateMany = vi.fn().mockResolvedValue([{ id: 'entry-1', userId: 'user-1' }]);
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
  const findFirst = vi.fn().mockResolvedValue({ collections: [], tags: [] });
  const aggregate = vi.fn().mockResolvedValue({ _sum: { hoursPlayed: null } });
  const groupBy = vi.fn().mockResolvedValue([]);
  const db = {
    libraryEntry: {
      updateManyAndReturn: updateMany,
      deleteMany,
      findFirst,
      count: vi.fn().mockResolvedValue(0),
      aggregate,
      groupBy,
    },
    campaign: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { hoursPlayed: null } }),
      count: vi.fn().mockResolvedValue(0),
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

    expect(updated).toEqual({
      id: 'entry-1',
      userId: 'user-1',
      collectionIds: [],
      tagIds: [],
      sources: [],
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      data: { status: 'PLAYING' },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'entry-1', userId: 'user-1' },
      select: {
        sources: {
          select: {
            id: true,
            kind: true,
            label: true,
            expiresAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        },
        collections: { select: { collectionId: true } },
        tags: { select: { tagId: true } },
      },
    });
  });

  it('does not read the row back when the owner filter matches nothing', async () => {
    const { db, updateMany, findFirst } = makeDb();
    updateMany.mockResolvedValueOnce([]);
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
  it('sums all recorded hours and limits ratings to progress statuses', async () => {
    const { db, aggregate, groupBy } = makeDb();
    const repo = new LibraryRepository(db as never);

    await repo.getStats('user-1');

    expect(aggregate).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
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
