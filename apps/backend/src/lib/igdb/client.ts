import { SEARCH_QUERY_MAX } from '@detonado/shared';
import { z } from 'zod';
import { IgdbError, ValidationError } from '@/lib/errors.js';
import { translateGenres } from '@/lib/igdb/genre-translations.js';
import { type IgdbGame, type IgdbGameRaw, igdbGameRawSchema } from '@/lib/igdb/schemas.js';

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

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

export class IgdbClient {
  private pendingToken: Promise<string> | null = null;
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

  private async query(body: string, isRetry = false): Promise<IgdbGameRaw[]> {
    const token = await this.getToken();
    const res = await this.fetchJson(`${IGDB_BASE_URL}/games`, {
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

    if (res.status < 200 || res.status >= 300) this.mapHttpError(res.status);
    const parsed = z.array(igdbGameRawSchema).safeParse(res.data);
    if (!parsed.success) throw new IgdbError('IGDB returned an invalid game payload', 502);
    return parsed.data;
  }

  private async getToken(): Promise<string> {
    const cached = await this.redis.get(TOKEN_KEY);
    if (cached) return cached;

    if (this.pendingToken) return this.pendingToken;
    this.pendingToken = this.fetchToken();
    try {
      return await this.pendingToken;
    } finally {
      this.pendingToken = null;
    }
  }

  private async fetchToken(): Promise<string> {
    const response = await this.fetchJson(TWITCH_TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (response.status < 200 || response.status >= 300) {
      throw new IgdbError(`Failed to obtain IGDB token (status ${response.status})`, 502);
    }
    const parsed = tokenSchema.safeParse(response.data);
    if (!parsed.success) throw new IgdbError('Twitch returned an invalid token payload', 502);
    const token = parsed.data;
    await this.redis.set(TOKEN_KEY, token.access_token, {
      EX: Math.max(1, Math.floor(token.expires_in - 60)),
    });
    return token.access_token;
  }

  private async fetchJson(
    url: string,
    init: RequestInit,
  ): Promise<{ status: number; data?: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      // The deadline also covers reading the body, not only receiving headers.
      const data: unknown = response.ok ? await response.json() : undefined;
      return { status: response.status, data };
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw new IgdbError('IGDB request timed out', 504);
      }
      if (error instanceof SyntaxError) throw new IgdbError('IGDB returned invalid JSON', 502);
      throw new IgdbError('IGDB request failed', 502);
    } finally {
      clearTimeout(timer);
    }
  }

  private mapHttpError(status: number): never {
    if (status === 400) throw new IgdbError('IGDB rejected the generated query', 502);
    if (status === 401) throw new IgdbError('Invalid IGDB credentials', 502);
    if (status === 403) throw new IgdbError('IGDB access forbidden', 502);
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

function transformGame(game: IgdbGameRaw): IgdbGame {
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
