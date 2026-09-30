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

  it('reads a legacy times object as found', () => {
    expect(parseHltbCache(JSON.stringify(TIMES))).toEqual({ status: 'FOUND', times: TIMES });
  });

  it('ignores a legacy null so a failure is not kept as a miss', () => {
    expect(parseHltbCache('null')).toBeNull();
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
