import type { HltbClient } from '@/lib/hltb/client.js';
import type { HltbLookup } from '@/lib/hltb/schemas.js';
import type { IgdbClient } from '@/lib/igdb/client.js';
import type { IgdbGame } from '@/lib/igdb/schemas.js';

const SEARCH_TTL = 60 * 10;
const GAME_TTL = 60 * 60 * 24;

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
}

export class GameService {
  constructor(
    private readonly igdb: IgdbClient,
    private readonly redis: RedisLike,
    private readonly hltb: HltbClient,
  ) {}

  async search(q: string): Promise<IgdbGame[]> {
    const key = `igdb:search:${q}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as IgdbGame[];

    const results = await this.igdb.searchGames(q);
    await this.redis.set(key, JSON.stringify(results), { EX: SEARCH_TTL });
    return results;
  }

  lookupByName(name: string) {
    return this.hltb.findByName(name, { fresh: true });
  }

  async getById(igdbId: number): Promise<IgdbGame | null> {
    const key = `igdb:game:${igdbId}`;
    const cached = await this.redis.get(key);
    if (cached) {
      const cachedGame = JSON.parse(cached) as IgdbGame;
      const settled = settledHltb(cachedGame);
      if (settled) return settled;
      const lookup = await this.hltb.findByName(cachedGame.name);
      return this.mergeHltb(key, cachedGame, lookup);
    }

    const game = await this.igdb.getGameById(igdbId);
    if (!game) return null;

    const lookup = await this.hltb.findByName(game.name);
    return this.mergeHltb(key, game, lookup);
  }

  private async mergeHltb(key: string, game: IgdbGame, lookup: HltbLookup): Promise<IgdbGame> {
    if (lookup.status === 'FAILED') {
      const igdbOnly = { ...game };
      delete igdbOnly.hltb;
      delete igdbOnly.hltbStatus;
      await this.redis.set(key, JSON.stringify(igdbOnly), { EX: GAME_TTL });
      return { ...igdbOnly, hltb: null, hltbStatus: 'FAILED' };
    }

    const merged: IgdbGame = {
      ...game,
      hltb: lookup.status === 'FOUND' ? lookup.times : null,
      hltbStatus: lookup.status,
    };
    await this.redis.set(key, JSON.stringify(merged), { EX: GAME_TTL });
    return merged;
  }
}

function settledHltb(game: IgdbGame): IgdbGame | null {
  if (game.hltbStatus === 'FOUND' || game.hltbStatus === 'MISS') return game;
  if (game.hltb && !game.hltbStatus) return { ...game, hltbStatus: 'FOUND' };
  return null;
}
