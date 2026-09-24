import { SEARCH_QUERY_MAX } from '@detonado/shared';
import { ForbiddenError, IgdbError, ValidationError } from '@/lib/errors.js';
import { translateGenres } from '@/lib/igdb/genre-translations.js';
import { type IgdbGame, igdbGameRawSchema } from '@/lib/igdb/schemas.js';

const TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const TOKEN_KEY = 'igdb:token';
const GAME_FIELDS =
  'fields id,name,cover.url,first_release_date,platforms.name,genres.id,genres.name,summary';

interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export class IgdbClient {
  constructor(
    private readonly redis: RedisLike,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly timeoutMs: number = 5000,
  ) {}

  async searchGames(q: string): Promise<IgdbGame[]> {
    const term = escapeIgdbSearch(q);
    const raw = await this.query(`${GAME_FIELDS}; search "${term}"; limit 10;`);
    return raw.map(transformGame);
  }

  async getGameById(id: number): Promise<IgdbGame | null> {
    const raw = await this.query(`${GAME_FIELDS}; where id = ${id};`);
    if (raw.length === 0) return null;
    return transformGame(raw[0]);
  }

  private async query(body: string, isRetry = false): Promise<unknown[]> {
    const token = await this.getToken();
    const res = await this.fetchWithTimeout(`${IGDB_BASE_URL}/games`, {
      method: 'POST',
      headers: {
        'Client-ID': this.clientId,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    });

    if (res.status === 401 && !isRetry) {
      await this.redis.del(TOKEN_KEY);
      return this.query(body, true);
    }

    if (!res.ok) this.mapHttpError(res.status);

    return res.json() as Promise<unknown[]>;
  }

  private async getToken(): Promise<string> {
    const cached = await this.redis.get(TOKEN_KEY);
    if (cached) return cached;

    const res = await this.fetchWithTimeout(
      `${TWITCH_TOKEN_URL}?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`,
      { method: 'POST' },
    );

    if (!res.ok) {
      throw new IgdbError(`Failed to obtain IGDB token (status ${res.status})`, 502);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    await this.redis.set(TOKEN_KEY, data.access_token, { EX: data.expires_in - 60 });
    return data.access_token;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new IgdbError('IGDB request timed out', 504);
      }
      throw new IgdbError('IGDB request failed', 502);
    } finally {
      clearTimeout(timer);
    }
  }

  private mapHttpError(status: number): never {
    if (status === 400) throw new ValidationError('Invalid IGDB query');
    if (status === 401) throw new IgdbError('Invalid IGDB credentials', 502);
    if (status === 403) throw new ForbiddenError('IGDB access forbidden');
    if (status >= 500) throw new IgdbError('IGDB service unavailable', 502);
    throw new IgdbError(`Unexpected IGDB response: ${status}`, 502);
  }
}

export function escapeIgdbSearch(q: string): string {
  if (q.length < 2 || q.length > SEARCH_QUERY_MAX) {
    throw new ValidationError('Consulta de busca inválida');
  }
  return q
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\r|\n/g, ' ');
}

function transformGame(raw: unknown): IgdbGame {
  const game = igdbGameRawSchema.parse(raw);
  return {
    igdbId: game.id,
    name: game.name,
    coverUrl: game.cover?.url ? normalizeUrl(game.cover.url) : undefined,
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : undefined,
    platforms: game.platforms?.map((p) => p.name) ?? [],
    genres: game.genres ? translateGenres(game.genres) : [],
    summary: game.summary,
  };
}

function normalizeUrl(url: string): string {
  return url.startsWith('//') ? `https:${url}` : url;
}
