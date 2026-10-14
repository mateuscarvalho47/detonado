import { z } from 'zod';
import { parseJsonCache } from '@/lib/cache.js';
import type { HltbClient } from '@/lib/hltb/client.js';
import type { IgdbClient } from '@/lib/igdb/client.js';
import { type IgdbGame, igdbGameSchema } from '@/lib/igdb/schemas.js';
import { GameNotFoundError } from './game.errors.js';

const SEARCH_TTL = 60 * 10;
const GAME_TTL = 60 * 60 * 24;

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
}

export class GameService {
  constructor(
    private readonly igdb: Pick<IgdbClient, 'searchGames' | 'getGameById'>,
    private readonly redis: RedisLike,
    private readonly hltb: Pick<HltbClient, 'findByName'>,
  ) {}

  async search(q: string): Promise<IgdbGame[]> {
    const key = `igdb:search:${q}`;
    const cached = await this.redis.get(key);
    const cachedGames = cached ? parseJsonCache(cached, z.array(igdbGameSchema)) : null;
    if (cachedGames) return cachedGames;

    const results = await this.igdb.searchGames(q);
    await this.redis.set(key, JSON.stringify(results), { EX: SEARCH_TTL });
    return results;
  }

  lookupByName(name: string) {
    return this.hltb.findByName(name, { fresh: true });
  }

  async getById(igdbId: number): Promise<IgdbGame> {
    // Keep provider caches independent: each owns its expiry and failure policy.
    const key = `igdb:v2:game:${igdbId}`;
    const cached = await this.redis.get(key);
    const cachedGame = cached ? parseJsonCache(cached, igdbGameSchema) : null;
    const game = cachedGame ?? (await this.igdb.getGameById(igdbId));
    if (!game) throw new GameNotFoundError();

    if (!cachedGame) await this.redis.set(key, JSON.stringify(game), { EX: GAME_TTL });

    const lookup = await this.hltb.findByName(game.name);
    return {
      ...game,
      hltb: lookup.status === 'FOUND' ? lookup.times : null,
      hltbStatus: lookup.status,
    };
  }
}
