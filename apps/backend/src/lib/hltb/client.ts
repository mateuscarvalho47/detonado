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
  del(key: string): Promise<unknown>;
}

interface Logger {
  warn: (obj: unknown, msg?: string) => void;
}

export class HltbClient {
  private readonly service = new HowLongToBeatService(MIN_SIMILARITY);

  constructor(
    private readonly redis: RedisLike,
    private readonly timeoutMs: number = 5000,
    private readonly logger?: Logger,
  ) {}

  async findByName(name: string, options?: { fresh?: boolean }): Promise<HltbLookup> {
    const key = `hltb:name:${name.toLowerCase().trim()}`;
    if (!options?.fresh) {
      const cached = await this.redis.get(key);
      if (cached) {
        const parsed = parseHltbCache(cached);
        if (parsed) return parsed;
      }
    }

    const lookup = await this.fetchTimes(name);
    const ttl = hltbCacheTtl(lookup);
    if (ttl == null) {
      await this.redis.del(key);
      return lookup;
    }

    await this.redis.set(key, JSON.stringify(lookup), { EX: ttl });
    return lookup;
  }

  private async fetchTimes(name: string): Promise<HltbLookup> {
    try {
      const result = await this.withTimeout(this.service.search(name));
      if (!result.success || result.data.length === 0) return { status: 'MISS' };

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

  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('HLTB request timed out')), this.timeoutMs);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }
}

function secondsToHours(seconds: number | undefined): number | null {
  if (!seconds || seconds <= 0) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}
