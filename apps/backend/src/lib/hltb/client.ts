import { HowLongToBeatService } from 'howlongtobeat-ts';
import {
  type HltbLookup,
  type HltbTimes,
  hltbCacheTtl,
  parseHltbCache,
} from '@/lib/hltb/schemas.js';

const MIN_SIMILARITY = 0.6;

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
}

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

export class HltbClient {
  private readonly service: HowLongToBeatService;
  private readonly pending = new Map<string, Promise<HltbLookup>>();

  constructor(
    private readonly redis: RedisLike,
    private readonly timeoutMs: number = 5000,
    private readonly logger?: Logger,
  ) {
    this.service = new HowLongToBeatService({
      minSimilarity: MIN_SIMILARITY,
      timeout: timeoutMs,
      retries: 0,
    });
  }

  async findByName(name: string, options?: { fresh?: boolean }): Promise<HltbLookup> {
    // v2 ignores misses produced by the old provider's retired endpoint.
    const key = `hltb:v2:name:${name.toLowerCase().trim()}`;
    if (!options?.fresh) {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = parseHltbCache(cached);
        if (parsed) return parsed;
      }
    }

    const existing = this.pending.get(key);
    if (existing) return existing;

    const lookup = this.fetchAndCache(key, name);
    this.pending.set(key, lookup);
    try {
      return await lookup;
    } finally {
      this.pending.delete(key);
    }
  }

  private async fetchAndCache(key: string, name: string): Promise<HltbLookup> {
    const lookup = await this.fetchTimes(name);
    const ttl = hltbCacheTtl(lookup);
    // A failed refresh must not evict previously valid times.
    if (ttl !== null) await this.redis.set(key, JSON.stringify(lookup), { EX: ttl });
    return lookup;
  }

  private async fetchTimes(name: string): Promise<HltbLookup> {
    try {
      const result = await this.service.search(name, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!result.success) {
        this.logger?.warn(
          { name, error: result.error, kind: result.kind, status: result.status },
          'HLTB lookup failed',
        );
        return { status: 'FAILED' };
      }
      if (result.data.length === 0) return { status: 'MISS' };

      const best = result.data[0];
      const times: HltbTimes = {
        mainHours: secondsToHours(best.mainTime),
        mainExtraHours: secondsToHours(best.mainExtraTime),
        completionistHours: secondsToHours(best.completionistTime),
      };

      const empty =
        times.mainHours == null && times.mainExtraHours == null && times.completionistHours == null;
      if (empty) return { status: 'MISS' };

      return { status: 'FOUND', times };
    } catch (err) {
      this.logger?.warn({ err, name }, 'HLTB lookup failed');
      return { status: 'FAILED' };
    }
  }
}

function secondsToHours(seconds: number | undefined): number | null {
  if (!seconds || seconds <= 0) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}
