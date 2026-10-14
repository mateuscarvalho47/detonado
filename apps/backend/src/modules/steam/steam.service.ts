import { ForbiddenError } from '@/lib/errors.js';
import type { IgdbClient } from '@/lib/igdb/client.js';
import type { SteamClient } from '@/lib/steam/client.js';
import { requireSteamKey } from '@/lib/steam/http.js';
import type { SteamRepository } from './steam.repository.js';
import type { SteamPreviewInput } from './steam.schema.js';
export class SteamService {
  constructor(
    private readonly steam: Pick<SteamClient, 'getOwnedGames'>,
    private readonly igdb: Pick<IgdbClient, 'matchSteamGames'>,
    private readonly repository: Pick<SteamRepository, 'findExisting'>,
    private readonly apiKey?: string,
  ) {}
  async preview(userId: string, verifiedSteamId: string | undefined, input: SteamPreviewInput) {
    requireSteamKey(this.apiKey);
    if (!verifiedSteamId) throw new ForbiddenError('Verifique sua conta Steam antes de importar.');
    const games = await this.steam.getOwnedGames(verifiedSteamId);
    const page = games.slice(input.offset, input.offset + input.limit);
    const matches = await this.igdb.matchSteamGames(page.map((game) => game.appId));
    const existing = new Set(
      (
        await this.repository.findExisting(
          userId,
          [...matches.values()].flatMap((game) => (game ? [game.igdbId] : [])),
        )
      ).map((entry) => entry.igdbId),
    );
    return {
      steamId: verifiedSteamId,
      total: games.length,
      offset: input.offset,
      limit: input.limit,
      hasMore: input.offset + input.limit < games.length,
      rows: page.map((game) => {
        const match = matches.get(game.appId) ?? null;
        return {
          appId: game.appId,
          name: game.name,
          hoursPlayed: Math.round(game.minutes / 6) / 10,
          match,
          duplicate: match ? existing.has(match.igdbId) : false,
          userPlatform: match?.platforms.includes('PC (Microsoft Windows)')
            ? 'PC (Microsoft Windows)'
            : null,
        };
      }),
    };
  }
}
