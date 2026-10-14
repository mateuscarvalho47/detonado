import {
  commitLibraryImportSchema,
  libraryImportRowSchema,
  previewLibraryImportSchema,
} from '@detonado/shared';
import { describe, expect, it, vi } from 'vitest';
import { GameNotFoundError } from '@/modules/game/game.errors.js';
import { LibraryImportService } from '@/modules/library-import/library-import.service.js';

function setup() {
  const repository = {
    findExisting: vi.fn().mockResolvedValue([{ id: 'existing', igdbId: 1 }]),
    findOwned: vi
      .fn()
      .mockImplementation(async (_userId, id) => (id === 1 ? { id: 'existing', igdbId: 1 } : null)),
  };
  const library = {
    create: vi.fn().mockImplementation(async (_userId, row) => {
      if (row.igdbId === 99) throw new GameNotFoundError();
      return { id: `entry-${row.igdbId}` };
    }),
    update: vi.fn().mockResolvedValue({ id: 'existing' }),
  };
  return { repository, library, service: new LibraryImportService(repository, library) };
}

describe('library CSV import', () => {
  it('validates cells, numeric strings, zero, null and batch bounds', () => {
    expect(
      libraryImportRowSchema.parse({
        igdbId: '42',
        hoursPlayed: '1.26',
        rating: '0',
        notes: '',
        status: '',
      }),
    ).toEqual({
      igdbId: 42,
      hoursPlayed: 1.3,
      rating: 0,
      notes: undefined,
      status: undefined,
      duplicateAction: 'SKIP',
    });
    expect(libraryImportRowSchema.parse({ igdbId: 42, hoursPlayed: null }).hoursPlayed).toBeNull();
    for (const input of [
      { igdbId: true },
      { name: '' },
      { igdbId: 42, password: 'secret' },
      { igdbId: 42, status: 'Jogando' },
      { igdbId: 42, completedAt: '2026-02-30' },
    ])
      expect(libraryImportRowSchema.safeParse(input).success).toBe(false);
    expect(
      previewLibraryImportSchema.safeParse({ rows: Array(101).fill({ igdbId: 1 }) }).success,
    ).toBe(false);
    expect(
      commitLibraryImportSchema.safeParse({ rows: Array(11).fill({ igdbId: 1 }) }).success,
    ).toBe(false);
  });

  it('previews invalid, unresolved and repeated records without writing', async () => {
    const { service, library } = setup();
    const preview = await service.preview('owner', [
      { igdbId: 1 },
      { name: 'Hollow Knight' },
      { igdbId: 2 },
      { igdbId: 2 },
      { igdbId: false },
    ]);
    expect(preview.rows.map((row) => row.state)).toEqual([
      'DUPLICATE',
      'NEEDS_MATCH',
      'READY',
      'DUPLICATE',
      'INVALID',
    ]);
    expect(preview.rows[4].input).toBeNull();
    expect(library.create).not.toHaveBeenCalled();
    expect(library.update).not.toHaveBeenCalled();
  });

  it('skips duplicates by default, updates only explicit cells and returns partial failures', async () => {
    const { service, library } = setup();
    const result = await service.commit('owner', [
      { igdbId: 1 },
      { igdbId: 1, duplicateAction: 'UPDATE', hoursPlayed: '0', notes: '' },
      { igdbId: 2, status: 'COMPLETED', hoursPlayed: 5, completedAt: '2026-10-01' },
      { name: 'Unresolved' },
      { igdbId: 99 },
      { igdbId: -1 },
    ]);
    expect(result.results.map((row) => row.state)).toEqual([
      'SKIPPED',
      'UPDATED',
      'ADDED',
      'FAILED',
      'FAILED',
      'FAILED',
    ]);
    expect(result.summary).toEqual({ skipped: 1, updated: 1, added: 1, failed: 3 });
    expect(library.update).toHaveBeenCalledExactlyOnceWith('existing', 'owner', { hoursPlayed: 0 });
    expect(library.create).toHaveBeenCalledWith(
      'owner',
      expect.objectContaining({
        igdbId: 2,
        status: 'COMPLETED',
        hoursPlayed: 5,
        completedAt: '2026-10-01',
      }),
    );
  });
});
