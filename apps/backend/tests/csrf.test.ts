import { describe, expect, it } from 'vitest';
import { csrfTokensMatch } from '@/plugins/csrf.js';

describe('csrfTokensMatch', () => {
  it('accepts the session token', () => {
    expect(csrfTokensMatch('abc123', 'abc123')).toBe(true);
  });

  it('rejects a missing, empty, or different token', () => {
    expect(csrfTokensMatch(undefined, 'abc123')).toBe(false);
    expect(csrfTokensMatch('abc123', undefined)).toBe(false);
    expect(csrfTokensMatch('abc123', ['abc123'])).toBe(false);
    expect(csrfTokensMatch('abc123', 'abc124')).toBe(false);
    expect(csrfTokensMatch('abc', 'abcd')).toBe(false);
    expect(csrfTokensMatch('', '')).toBe(false);
  });
});
