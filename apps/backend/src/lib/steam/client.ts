import { z } from 'zod';
import { AppError, ForbiddenError } from '@/lib/errors.js';
import { requireSteamKey, steamText } from './http.js';

const gameSchema = z.object({
  appId: z.number().int().positive(),
  name: z.string(),
  minutes: z.number().int().nonnegative(),
});
const gamesSchema = z.array(gameSchema);
const payloadSchema = z.object({
  response: z.object({
    game_count: z.number().int().nonnegative().optional(),
    games: z
      .array(
        z.object({
          appid: z.number().int().positive(),
          name: z.string().optional(),
          playtime_forever: z.number().int().nonnegative().optional(),
        }),
      )
      .optional(),
  }),
});
export interface SteamCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<unknown>;
}
export class SteamClient {
  constructor(
    private readonly key: string | undefined,
    private readonly cache: SteamCache,
    private readonly timeoutMs = 5000,
  ) {}
  async getOwnedGames(steamId: string) {
    requireSteamKey(this.key);
    if (!/^\d{17}$/.test(steamId)) throw new ForbiddenError('Verifique sua conta Steam novamente.');
    const cacheKey = `steam:v1:owned:${steamId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      try {
        const parsed = gamesSchema.safeParse(JSON.parse(cached));
        if (parsed.success) return parsed.data;
      } catch {
        /* Invalid cache is replaced from Steam. */
      }
    }
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
    url.searchParams.set(
      'input_json',
      JSON.stringify({ steamid: steamId, include_appinfo: true, include_played_free_games: true }),
    );
    const raw = await steamText(
      url.toString(),
      { headers: { 'x-webapi-key': this.key } },
      this.timeoutMs,
    );
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new AppError('STEAM_INVALID_RESPONSE', 502, 'Steam retornou uma resposta inválida.');
    }
    const parsed = payloadSchema.safeParse(value);
    if (!parsed.success)
      throw new AppError('STEAM_INVALID_RESPONSE', 502, 'Steam retornou uma resposta inválida.');
    const payload = parsed.data.response;
    // Missing game_count is unavailable access, never an empty library. In
    // particular, a public profile does not imply publicly visible game details.
    if (payload.game_count === undefined)
      throw new ForbiddenError(
        'Steam não disponibilizou a biblioteca. Confira a visibilidade dos detalhes dos jogos.',
      );
    if (payload.game_count !== (payload.games?.length ?? 0))
      throw new AppError(
        'STEAM_INVALID_RESPONSE',
        502,
        'Steam retornou uma biblioteca incompleta.',
      );
    const seen = new Set<number>();
    const games = (payload.games ?? [])
      .flatMap((game) => {
        if (seen.has(game.appid)) return [];
        seen.add(game.appid);
        return [
          {
            appId: game.appid,
            name: game.name ?? `App ${game.appid}`,
            minutes: game.playtime_forever ?? 0,
          },
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.appId - b.appId);
    await this.cache.set(cacheKey, JSON.stringify(games), { EX: 300 });
    return games;
  }
}
