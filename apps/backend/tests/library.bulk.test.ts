import { bulkLibraryInputSchema } from '@detonado/shared';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '@/lib/errors.js';
import { LibraryBulkService } from '@/modules/library/library.bulk.service.js';

describe('bulk library editing', () => {
  it('validates bounded unique IDs and explicit changes', () => {
    for (const payload of [
      { ids: [], changes: { status: 'PLAYING' } },
      { ids: ['same', 'same'], changes: { status: 'PLAYING' } },
      { ids: Array.from({ length: 101 }, (_, i) => String(i)), changes: { status: 'PLAYING' } },
      { ids: ['a'], changes: {} },
      { ids: ['a'], changes: { userPlatform: '' } },
      { ids: ['a'], changes: { tagIds: ['same', 'same'] } },
      { ids: ['a'], changes: { hoursPlayed: 0 } },
    ])
      expect(bulkLibraryInputSchema.safeParse(payload).success).toBe(false);
    expect(
      bulkLibraryInputSchema.parse({ ids: ['a'], changes: { userPlatform: null, tagIds: [] } })
        .changes,
    ).toEqual({ userPlatform: null, tagIds: [] });
  });
  it('returns per-game failures while preserving the remaining batch', async () => {
    const library = {
      update: vi.fn().mockImplementation(async (id) => {
        if (id === 'unsupported') throw new ValidationError('Plataforma não disponível');
        return { id };
      }),
    };
    const result = await new LibraryBulkService(library).update('owner', {
      ids: ['valid', 'unsupported', 'other'],
      changes: { status: 'PLAYING', tagIds: ['tag'] },
    });
    expect(result.summary).toEqual({ updated: 2, failed: 1 });
    expect(result.results[1]).toEqual({
      id: 'unsupported',
      state: 'FAILED',
      error: 'Plataforma não disponível',
    });
    expect(library.update).toHaveBeenCalledWith(
      'valid',
      'owner',
      { status: 'PLAYING' },
      { tagIds: ['tag'], requireSupportedPlatform: true },
    );
  });
});
