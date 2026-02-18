import type { MediaType } from '../domain/media';
import { parseMediaIdInput } from '../ids/mediaId';
import { mediaTypeToProviderKind } from '../ids/canonical';
import { normalizeImdbId } from '../ids/externalIds';
import type { SimklItemType } from './types';

export interface ResolveSimklIdOptions {
  clientId: string;
  fetch?: typeof fetch;
  baseUrl?: string;
  signal?: AbortSignal;
}

export class SimklResolveError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SimklResolveError';
    if (typeof status === 'number') {
      this.status = status;
    }
  }
}

type SearchIdResponseItem = {
  type?: unknown;
  ids?: unknown;
};

function ensureBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function normalizeItemType(value: unknown): SimklItemType | null {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'movie' || lowered === 'tv' || lowered === 'anime') {
    return lowered as SimklItemType;
  }
  // Some endpoints use `show` to mean tv+anime.
  if (lowered === 'show') {
    return 'tv';
  }
  return null;
}

function idsFromSearchItemIds(value: unknown): { simkl?: number; imdb?: string; tmdb?: number; tvdb?: number; slug?: string } {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  if (!record) return {};

  const result: { simkl?: number; imdb?: string; tmdb?: number; tvdb?: number; slug?: string } = {};

  const simklRaw = record.simkl ?? record.simkl_id;
  const simkl = typeof simklRaw === 'number'
    ? Math.trunc(simklRaw)
    : typeof simklRaw === 'string'
      ? Number.parseInt(simklRaw.trim(), 10)
      : NaN;
  if (Number.isFinite(simkl) && simkl > 0) result.simkl = simkl;

  const imdb = normalizeImdbId(typeof record.imdb === 'string' ? record.imdb : undefined);
  if (imdb) result.imdb = imdb;

  const tmdb = typeof record.tmdb === 'number'
    ? Math.trunc(record.tmdb)
    : typeof record.tmdb === 'string'
      ? Number.parseInt(record.tmdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tmdb) && tmdb > 0) result.tmdb = tmdb;

  const tvdb = typeof record.tvdb === 'number'
    ? Math.trunc(record.tvdb)
    : typeof record.tvdb === 'string'
      ? Number.parseInt(record.tvdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tvdb) && tvdb > 0) result.tvdb = tvdb;

  const slug = typeof record.slug === 'string' && record.slug.trim() ? record.slug.trim() : undefined;
  if (slug) result.slug = slug;

  return result;
}

function makeSearchUrl(baseUrl: string, clientId: string, params: Record<string, string>): string {
  const url = new URL(`${ensureBaseUrl(baseUrl)}/search/id`);
  url.searchParams.set('client_id', clientId);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function resolveSimklId(
  input: string | number,
  type: MediaType,
  options: ResolveSimklIdOptions
): Promise<{ simklId: number | null; slug?: string; imdbId?: string; tmdbId?: number; tvdbId?: number }> {
  const clientId = options.clientId?.trim();
  if (!clientId) {
    throw new SimklResolveError('Missing Simkl clientId');
  }

  // Strict parsing: bare numeric inputs are NOT assumed to be Simkl.
  const parsed = parseMediaIdInput(input, { assumeNumeric: 'none' });

  const expectedKind = mediaTypeToProviderKind(type);
  if (parsed.kind && parsed.kind !== expectedKind) {
    return { simklId: null };
  }

  // If a different provider is explicitly specified, do not attempt Simkl resolution.
  if (parsed.provider && parsed.provider !== 'simkl' && parsed.provider !== 'imdb' && parsed.provider !== 'tmdb' && parsed.provider !== 'tvdb') {
    return { simklId: null };
  }

  if (parsed.ids.simkl) {
    const out: { simklId: number | null; slug?: string; imdbId?: string; tmdbId?: number; tvdbId?: number } = { simklId: parsed.ids.simkl };
    if (parsed.ids.imdb) out.imdbId = parsed.ids.imdb;
    if (parsed.ids.tmdb) out.tmdbId = parsed.ids.tmdb;
    if (parsed.ids.tvdb) out.tvdbId = parsed.ids.tvdb;
    if (parsed.ids.slug) out.slug = parsed.ids.slug;
    return out;
  }

  const baseUrl = options.baseUrl ?? 'https://api.simkl.com';
  const fetchImpl = options.fetch ?? fetch;

  const params: Record<string, string> = {};
  if (parsed.ids.imdb) {
    params.imdb = parsed.ids.imdb;
  } else if (parsed.ids.tmdb) {
    params.tmdb = String(parsed.ids.tmdb);
    params.type = expectedKind === 'movie' ? 'movie' : 'show';
  } else if (parsed.ids.tvdb) {
    params.tvdb = String(parsed.ids.tvdb);
  } else {
    return { simklId: null };
  }

  const url = makeSearchUrl(baseUrl, clientId, params);
  const init: RequestInit = {
    method: 'GET',
    headers: {
      'simkl-api-key': clientId,
    },
  };
  if (options.signal) {
    init.signal = options.signal;
  }

  const res = await fetchImpl(url, init);
  if (!res.ok) {
    throw new SimklResolveError(`Simkl /search/id failed (${res.status})`, res.status);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return { simklId: null };
  }

  const candidates: Array<{ ids: ReturnType<typeof idsFromSearchItemIds> }> = [];
  for (const item of data as SearchIdResponseItem[]) {
    const itemType = normalizeItemType(item?.type);
    const matchesKind = expectedKind === 'movie'
      ? itemType === 'movie'
      : itemType === 'tv' || itemType === 'anime';
    if (!matchesKind) continue;

    const ids = idsFromSearchItemIds(item?.ids);
    if (!ids.simkl) continue;
    candidates.push({ ids });
  }

  const first = candidates[0]?.ids;
  if (!first?.simkl) {
    return { simklId: null };
  }

  const out: { simklId: number | null; slug?: string; imdbId?: string; tmdbId?: number; tvdbId?: number } = { simklId: first.simkl };
  if (first.slug) out.slug = first.slug;
  if (first.imdb) out.imdbId = first.imdb;
  if (first.tmdb) out.tmdbId = first.tmdb;
  if (first.tvdb) out.tvdbId = first.tvdb;
  return out;
}
