import { describe, expect, it } from 'vitest';
import { hltbCacheTtl, parseHltbCache } from '@/lib/hltb/schemas.js';

const TIMES = { mainHours: 10, mainExtraHours: null, completionistHours: 40 };

describe('parseHltbCache', () => {
  it('reads a found payload', () => {
    const raw = JSON.stringify({ status: 'FOUND', times: TIMES });
    expect(parseHltbCache(raw)).toEqual({ status: 'FOUND', times: TIMES });
  });

  it('reads a miss payload', () => {
    expect(parseHltbCache(JSON.stringify({ status: 'MISS' }))).toEqual({ status: 'MISS' });
  });

  it('ignores a cached failure so the next read tries again', () => {
    expect(parseHltbCache(JSON.stringify({ status: 'FAILED' }))).toBeNull();
  });

  it('ignores a legacy times object after the cache version change', () => {
    expect(parseHltbCache(JSON.stringify(TIMES))).toBeNull();
  });

  it('ignores a legacy null so a failure is not kept as a miss', () => {
    expect(parseHltbCache('null')).toBeNull();
  });
});

describe('invalid cache payloads', () => {
  it.each([
    '{broken',
    '{"status":"FOUND","times":{}}',
    '{"status":"FOUND","times":{"mainHours":"10"}}',
    '{"status":"FOUND","times":{"mainHours":-1,"mainExtraHours":null,"completionistHours":null}}',
  ])('ignores %s', (raw) => {
    expect(parseHltbCache(raw)).toBeNull();
  });
});

describe('hltbCacheTtl', () => {
  it('keeps a found result for a day and a miss for an hour', () => {
    expect(hltbCacheTtl({ status: 'FOUND', times: TIMES })).toBe(60 * 60 * 24);
    expect(hltbCacheTtl({ status: 'MISS' })).toBe(60 * 60);
  });

  it('does not cache a failure', () => {
    expect(hltbCacheTtl({ status: 'FAILED' })).toBeNull();
  });
});
