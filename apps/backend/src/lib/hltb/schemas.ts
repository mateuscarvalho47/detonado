import { z } from 'zod';

export const hltbTimesSchema = z.object({
  mainHours: z.number().nullable(),
  mainExtraHours: z.number().nullable(),
  completionistHours: z.number().nullable(),
});

export type HltbTimes = z.infer<typeof hltbTimesSchema>;

export const hltbStatusSchema = z.enum(['FOUND', 'MISS', 'FAILED']);

export type HltbStatus = z.infer<typeof hltbStatusSchema>;

export type HltbLookup =
  | { status: 'FOUND'; times: HltbTimes }
  | { status: 'MISS' }
  | { status: 'FAILED' };

const FOUND_TTL_SECONDS = 60 * 60 * 24;
const MISS_TTL_SECONDS = 60 * 60;

export function parseHltbCache(raw: string): HltbLookup | null {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object') return null;

  const record = parsed as { status?: string; times?: HltbTimes; mainHours?: unknown };
  if (record.status === 'FOUND' && record.times) return { status: 'FOUND', times: record.times };
  if (record.status === 'MISS') return { status: 'MISS' };
  if (record.status === 'FAILED') return null;
  if ('mainHours' in record) return { status: 'FOUND', times: record as HltbTimes };
  return null;
}

export function hltbCacheTtl(lookup: HltbLookup): number | null {
  if (lookup.status === 'FOUND') return FOUND_TTL_SECONDS;
  if (lookup.status === 'MISS') return MISS_TTL_SECONDS;
  return null;
}
