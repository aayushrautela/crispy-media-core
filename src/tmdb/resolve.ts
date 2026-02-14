import type { MediaType } from '../domain/media';
import { parseMediaIdInput } from '../ids/mediaId';

export interface ResolveTmdbIdOptions {
  apiKey: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  signal?: AbortSignal;
}

export class TmdbResolveError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TmdbResolveError';
    if (typeof status === 'number') {
      this.status = status;
    }
  }
}

type FindResponse = {
  movie_results?: Array<{ id?: number }>;
  tv_results?: Array<{ id?: number }>;
};

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n > 0 ? n : null;
}

/**
 * Resolves a TMDB numeric id from various inputs:
 * - `tmdb:<id>` (with optional `:<season>:<episode>` suffix)
 * - raw numeric strings
 * - IMDB ids (`tt123...` / `imdb:tt123...` / `imdb:123...`)
 */
export async function resolveTmdbId(input: string | number, type: MediaType, options: ResolveTmdbIdOptions): Promise<{ tmdbId: number | null; imdbId?: string }>{
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new TmdbResolveError('Missing TMDB apiKey');
  }

  const parsed = parseMediaIdInput(input);

  if (parsed.ids.tmdb) {
    const result: { tmdbId: number | null; imdbId?: string } = { tmdbId: parsed.ids.tmdb };
    if (parsed.ids.imdb) {
      result.imdbId = parsed.ids.imdb;
    }
    return result;
  }

  const imdb = parsed.ids.imdb;
  if (!imdb) {
    return { tmdbId: null };
  }

  const baseUrl = (options.baseUrl || 'https://api.themoviedb.org/3').replace(/\/$/, '');
  const fetchImpl = options.fetch || fetch;

  const url = `${baseUrl}/find/${encodeURIComponent(imdb)}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id`;
  const init: RequestInit = { method: 'GET' };
  if (options.signal) {
    init.signal = options.signal;
  }

  const res = await fetchImpl(url, init);
  if (!res.ok) {
    throw new TmdbResolveError(`TMDB /find failed (${res.status})`, res.status);
  }

  const data = (await res.json()) as FindResponse;
  const candidate = type === 'movie'
    ? data.movie_results?.[0]?.id
    : data.tv_results?.[0]?.id;

  return { tmdbId: toPositiveInt(candidate), imdbId: imdb };
}
