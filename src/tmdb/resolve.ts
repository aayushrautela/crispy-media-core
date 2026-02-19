import type { MediaType } from '../domain/media';
import { parseMediaIdInput } from '../ids/mediaId';
import { mediaTypeToProviderKind } from '../ids/providerRef';

export interface ResolveTmdbIdOptions {
  apiKey: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  signal?: AbortSignal;
  resolveImdbForTmdbId?: boolean;
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

type ExternalIdsResponse = {
  imdb_id?: string | null;
};

function toPositiveInt(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  return n > 0 ? n : null;
}

function normalizeImdbId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return /^tt\d+$/i.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

async function resolveImdbFromTmdbId(tmdbId: number, type: MediaType, options: ResolveTmdbIdOptions): Promise<string | undefined> {
  const baseUrl = (options.baseUrl || 'https://api.themoviedb.org/3').replace(/\/$/, '');
  const fetchImpl = options.fetch || fetch;
  const route = type === 'movie' ? 'movie' : 'tv';
  const url = `${baseUrl}/${route}/${tmdbId}/external_ids?api_key=${encodeURIComponent(options.apiKey)}`;

  const init: RequestInit = { method: 'GET' };
  if (options.signal) {
    init.signal = options.signal;
  }

  try {
    const res = await fetchImpl(url, init);
    if (!res.ok) {
      return undefined;
    }

    const data = (await res.json()) as ExternalIdsResponse;
    return normalizeImdbId(data.imdb_id);
  } catch {
    return undefined;
  }
}

/**
 * Resolves a TMDB numeric id from various inputs:
 * - `tmdb:movie:<id>` or `tmdb:show:<id>` (with optional `:<season>:<episode>` suffix)
 * - legacy `tmdb:<id>`
 * - IMDB ids (`tt123...` / `imdb:tt123...` / `imdb:123...`)
 */
export async function resolveTmdbId(input: string | number, type: MediaType, options: ResolveTmdbIdOptions): Promise<{ tmdbId: number | null; imdbId?: string }>{
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new TmdbResolveError('Missing TMDB apiKey');
  }

  // Strict parsing: bare numeric inputs are NOT assumed to be TMDB.
  // Callers must pass `tmdb:movie:<id>` / `tmdb:show:<id>` (or an IMDB id) to resolve.
  const parsed = parseMediaIdInput(input, { assumeNumeric: 'none' });

  const expectedKind = mediaTypeToProviderKind(type);
  if (parsed.kind && parsed.kind !== expectedKind) {
    return { tmdbId: null };
  }

  // If a different provider is explicitly specified, do not attempt TMDB resolution.
  if (parsed.provider && parsed.provider !== 'tmdb' && parsed.provider !== 'imdb') {
    return { tmdbId: null };
  }

  if (parsed.ids.tmdb) {
    const result: { tmdbId: number | null; imdbId?: string } = { tmdbId: parsed.ids.tmdb };
    if (parsed.ids.imdb) {
      result.imdbId = parsed.ids.imdb;
    } else if (options.resolveImdbForTmdbId) {
      const imdbId = await resolveImdbFromTmdbId(parsed.ids.tmdb, type, options);
      if (imdbId) {
        result.imdbId = imdbId;
      }
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
