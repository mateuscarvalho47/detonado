import { describe, expect, it } from 'vitest';
import { parseTrustProxy } from '@/lib/trustProxy.js';

describe('parseTrustProxy', () => {
  it('defaults a missing value to false', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('')).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('accepts true and a hop count', () => {
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(2)).toBe(2);
  });

  it('rejects anything else', () => {
    expect(() => parseTrustProxy('yes')).toThrow(/TRUST_PROXY/);
    expect(() => parseTrustProxy(1.5)).toThrow(/TRUST_PROXY/);
  });
});
