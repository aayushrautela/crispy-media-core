import type { ProviderResolver, ResolveContext } from '../routing/router';
import type { ProviderRef } from '../ids/providerRef';
import { normalizeImdbId } from '../ids/externalIds';
import type { SimklItemType } from './types';

export interface SimklSearchIdResolverOptions {
  clientId: string;
  fetch?: typeof fetch;
  baseUrl?: string;
}

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
  if (lowered === 'show') return 'tv';
  return null;
}

function idsFromSearchItemIds(value: unknown): { simkl?: number; imdb?: string; tmdb?: number; tvdb?: number } {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
  if (!record) return {};

  const out: { simkl?: number; imdb?: string; tmdb?: number; tvdb?: number } = {};

  const simklRaw = record.simkl ?? record.simkl_id;
  const simkl = typeof simklRaw === 'number'
    ? Math.trunc(simklRaw)
    : typeof simklRaw === 'string'
      ? Number.parseInt(simklRaw.trim(), 10)
      : NaN;
  if (Number.isFinite(simkl) && simkl > 0) out.simkl = simkl;

  const imdb = normalizeImdbId(typeof record.imdb === 'string' ? record.imdb : undefined);
  if (imdb) out.imdb = imdb;

  const tmdb = typeof record.tmdb === 'number'
    ? Math.trunc(record.tmdb)
    : typeof record.tmdb === 'string'
      ? Number.parseInt(record.tmdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tmdb) && tmdb > 0) out.tmdb = tmdb;

  const tvdb = typeof record.tvdb === 'number'
    ? Math.trunc(record.tvdb)
    : typeof record.tvdb === 'string'
      ? Number.parseInt(record.tvdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tvdb) && tvdb > 0) out.tvdb = tvdb;

  return out;
}

async function fetchSearchId(
  options: SimklSearchIdResolverOptions,
  params: Record<string, string>,
  context?: ResolveContext
): Promise<unknown[] | null> {
  const clientId = options.clientId?.trim();
  if (!clientId) return null;

  const baseUrl = ensureBaseUrl(options.baseUrl ?? 'https://api.simkl.com');
  const url = new URL(`${baseUrl}/search/id`);
  url.searchParams.set('client_id', clientId);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const fetchImpl = options.fetch ?? fetch;
  const init: RequestInit = {
    method: 'GET',
    headers: {
      'simkl-api-key': clientId,
    },
  };
  if (context?.signal) {
    init.signal = context.signal;
  }

  const res = await fetchImpl(url.toString(), init);
  if (!res.ok) return null;

  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? data : null;
}

function pickCandidate(list: unknown[], expectedKind: 'movie' | 'show'): { simkl?: number; imdb?: string; tmdb?: number; tvdb?: number } | null {
  for (const item of list) {
    const rec = typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null;
    if (!rec) continue;

    const itemType = normalizeItemType(rec.type);
    const matches = expectedKind === 'movie'
      ? itemType === 'movie'
      : itemType === 'tv' || itemType === 'anime';
    if (!matches) continue;

    const ids = idsFromSearchItemIds(rec.ids);
    if (ids.simkl || ids.imdb || ids.tmdb || ids.tvdb) {
      return ids;
    }
  }
  return null;
}

export function createImdbToSimklResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'imdb',
    to: 'simkl',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'imdb') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      const list = await fetchSearchId(options, { imdb: input.id, type: input.kind === 'movie' ? 'movie' : 'show' }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.simkl) return null;
      return { provider: 'simkl', kind: input.kind, id: candidate.simkl };
    },
  };
}

export function createTmdbToSimklResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'tmdb',
    to: 'simkl',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'tmdb') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      // For TV show lookups Simkl expects `type=show` (not `tv`).
      const list = await fetchSearchId(options, { tmdb: String(input.id), type: input.kind === 'movie' ? 'movie' : 'show' }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.simkl) return null;
      return { provider: 'simkl', kind: input.kind, id: candidate.simkl };
    },
  };
}

export function createTvdbToSimklResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'tvdb',
    to: 'simkl',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'tvdb') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      const list = await fetchSearchId(options, { tvdb: String(input.id), type: input.kind === 'movie' ? 'movie' : 'show' }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.simkl) return null;
      return { provider: 'simkl', kind: input.kind, id: candidate.simkl };
    },
  };
}

export function createSimklToImdbResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'simkl',
    to: 'imdb',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'simkl') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      const list = await fetchSearchId(options, { simkl: String(input.id) }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.imdb) return null;
      return { provider: 'imdb', kind: input.kind, id: candidate.imdb };
    },
  };
}

export function createSimklToTmdbResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'simkl',
    to: 'tmdb',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'simkl') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      const list = await fetchSearchId(options, { simkl: String(input.id) }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.tmdb) return null;
      return { provider: 'tmdb', kind: input.kind, id: candidate.tmdb };
    },
  };
}

export function createSimklToTvdbResolver(options: SimklSearchIdResolverOptions): ProviderResolver {
  return {
    from: 'simkl',
    to: 'tvdb',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'simkl') return null;
      if (input.kind !== 'movie' && input.kind !== 'show') return null;

      const list = await fetchSearchId(options, { simkl: String(input.id) }, context);
      if (!list) return null;

      const candidate = pickCandidate(list, input.kind);
      if (!candidate?.tvdb) return null;
      return { provider: 'tvdb', kind: input.kind, id: candidate.tvdb };
    },
  };
}
