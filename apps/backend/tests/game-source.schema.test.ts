import {
  createGameSourceSchema,
  libraryFiltersSchema,
  updateGameSourceSchema,
} from '@detonado/shared';
import { describe, expect, it } from 'vitest';

describe('game source input', () => {
  it('accepts permanent and expired access, validates labels, kinds and dates', () => {
    expect(
      createGameSourceSchema.parse({ kind: 'STORE', label: '  Steam  ', expiresAt: null }),
    ).toEqual({ kind: 'STORE', label: 'Steam', expiresAt: null });
    expect(
      createGameSourceSchema.safeParse({
        kind: 'LOAN',
        label: 'Empréstimo',
        expiresAt: '2020-01-01T23:59:59-03:00',
      }).success,
    ).toBe(true);
    for (const value of [
      { kind: 'STORE', label: ' ' },
      { kind: 'OTHER', label: 'Test' },
      { kind: 'PHYSICAL', label: 'x'.repeat(201) },
      { kind: 'STORE', label: 'Test', expiresAt: '2026-02-30' },
      { kind: 'STORE', label: 'Test', userId: 'other' },
    ])
      expect(createGameSourceSchema.safeParse(value).success).toBe(false);
    expect(updateGameSourceSchema.safeParse({}).success).toBe(false);
    expect(updateGameSourceSchema.parse({ expiresAt: null })).toEqual({ expiresAt: null });
    expect(
      libraryFiltersSchema.parse({ sourceKind: 'SUBSCRIPTION', availability: 'EXPIRED' }),
    ).toEqual({ sourceKind: 'SUBSCRIPTION', availability: 'EXPIRED' });
  });
});
