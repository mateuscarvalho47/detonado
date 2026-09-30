import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/lib/errors.js';
import { calendarToday, parseCalendarDate } from '@/modules/library/library.dates.js';

describe('calendar dates', () => {
  it('stores a calendar day at UTC midnight', () => {
    expect(parseCalendarDate('2024-05-03').toISOString()).toBe('2024-05-03T00:00:00.000Z');
  });

  it('rejects a day that is not on the calendar', () => {
    expect(() => parseCalendarDate('2023-02-29')).toThrow(ValidationError);
    expect(() => parseCalendarDate('2024-13-01')).toThrow(ValidationError);
  });

  it('uses the São Paulo calendar when UTC is already the next day', () => {
    const today = calendarToday(new Date('2026-10-01T02:00:00.000Z'));
    expect(today.toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });
});
