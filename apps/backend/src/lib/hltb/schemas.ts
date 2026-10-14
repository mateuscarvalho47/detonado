import { hltbInfoSchema } from '@detonado/shared';
import { z } from 'zod';
import { parseJsonCache } from '@/lib/cache.js';

export const hltbTimesSchema = hltbInfoSchema.unwrap();
export type HltbTimes = z.infer<typeof hltbTimesSchema>;

export type HltbLookup =
  | { status: 'FOUND'; times: HltbTimes }
  | { status: 'MISS' }
  | { status: 'FAILED' };

const FOUND_TTL_SECONDS = 60 * 60 * 24;
const MISS_TTL_SECONDS = 60 * 60;

export function parseHltbCache(raw: string): HltbLookup | null {
  return parseJsonCache(raw, cachedLookupSchema);
}

const cachedLookupSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('FOUND'), times: hltbTimesSchema }),
  z.object({ status: z.literal('MISS') }),
]);

export function hltbCacheTtl(lookup: HltbLookup): number | null {
  if (lookup.status === 'FOUND') return FOUND_TTL_SECONDS;
  if (lookup.status === 'MISS') return MISS_TTL_SECONDS;
  return null;
}
