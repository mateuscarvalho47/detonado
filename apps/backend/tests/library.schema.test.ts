import { updateLibraryEntryInput } from '@detonado/shared';
import { describe, expect, it } from 'vitest';

describe('updateLibraryEntryInput', () => {
  it('leaves omitted progress fields out of the patch', () => {
    expect(updateLibraryEntryInput.parse({ status: 'BACKLOG' })).toEqual({ status: 'BACKLOG' });
  });

  it('rounds hours to the column scale and caps them', () => {
    expect(updateLibraryEntryInput.parse({ hoursPlayed: 1.26 })).toEqual({ hoursPlayed: 1.3 });
    expect(() => updateLibraryEntryInput.parse({ hoursPlayed: 100000 })).toThrow();
    expect(() => updateLibraryEntryInput.parse({ hoursPlayed: -1 })).toThrow();
  });

  it('accepts a real calendar date and rejects one that does not exist', () => {
    expect(updateLibraryEntryInput.parse({ completedAt: '2024-02-29' })).toEqual({
      completedAt: '2024-02-29',
    });
    expect(() => updateLibraryEntryInput.parse({ completedAt: '2023-02-29' })).toThrow();
    expect(() => updateLibraryEntryInput.parse({ completedAt: 'yesterday' })).toThrow();
  });

  it('rejects a note longer than the write cap', () => {
    expect(() => updateLibraryEntryInput.parse({ notes: 'a'.repeat(4001) })).toThrow();
    expect(updateLibraryEntryInput.parse({ notes: 'a'.repeat(4000) })).toEqual({
      notes: 'a'.repeat(4000),
    });
  });
});
