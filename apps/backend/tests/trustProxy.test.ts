import { describe, expect, it } from 'vitest';
import { parseTrustProxy, resolveTrustProxy } from '@/lib/trustProxy.js';

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

describe('resolveTrustProxy', () => {
  it('trusts one hop in production when the variable is unset', () => {
    expect(resolveTrustProxy(undefined, 'production')).toBe(1);
    expect(resolveTrustProxy('', 'production')).toBe(1);
  });

  it('stays closed outside production and when set to false', () => {
    expect(resolveTrustProxy(undefined, 'development')).toBe(false);
    expect(resolveTrustProxy(undefined, 'test')).toBe(false);
    expect(resolveTrustProxy('false', 'production')).toBe(false);
  });
});
