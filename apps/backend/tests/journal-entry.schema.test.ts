import { createJournalEntrySchema, updateJournalEntrySchema } from '@detonado/shared';
import { describe, expect, it } from 'vitest';

describe('journal entry validation', () => {
  it('accepts dated notes and rejects empty text, invalid dates and provenance changes', () => {
    expect(
      createJournalEntrySchema.parse({
        text: '  Missão concluída  ',
        occurredAt: '2026-10-14T01:00:00-03:00',
      }).text,
    ).toBe('Missão concluída');
    for (const row of [
      { text: ' ', occurredAt: '2026-10-14T04:00:00Z' },
      { text: 'x'.repeat(4001), occurredAt: '2026-10-14T04:00:00Z' },
      { text: 'Test', occurredAt: 'invalid' },
      { text: 'Test', occurredAt: '2026-10-14T04:00:00Z', legacy: true },
    ])
      expect(createJournalEntrySchema.safeParse(row).success).toBe(false);
    expect(updateJournalEntrySchema.safeParse({}).success).toBe(false);
    expect(updateJournalEntrySchema.safeParse({ campaignId: 'other' }).success).toBe(false);
    expect(updateJournalEntrySchema.safeParse({ legacy: false }).success).toBe(false);
    expect(updateJournalEntrySchema.parse({ spoiler: false })).toEqual({ spoiler: false });
  });
});
