import type { ProviderResolver, ResolveContext } from '../routing/router';
import { type ProviderRef } from '../ids/providerRef';

export interface ImdbToTmdbResolverOptions {
  apiKey: string;
  fetch?: typeof fetch;
  baseUrl?: string;
}

function ensureBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function createImdbToTmdbResolver(options: ImdbToTmdbResolverOptions): ProviderResolver {
  const fetchImpl = options.fetch ?? fetch;
  const baseUrl = ensureBaseUrl(options.baseUrl ?? 'https://api.themoviedb.org/3');

  return {
    from: 'imdb',
    to: 'tmdb',
    resolve: async (input: ProviderRef, context?: ResolveContext) => {
      if (input.provider !== 'imdb') return null;
      if (!options.apiKey?.trim()) return null;

      if (input.kind !== 'movie' && input.kind !== 'show') {
        return null;
      }

      const url = `${baseUrl}/find/${encodeURIComponent(input.id)}?api_key=${encodeURIComponent(options.apiKey)}&external_source=imdb_id`;
      const init: RequestInit = { method: 'GET' };
      if (context?.signal) {
        init.signal = context.signal;
      }
      const res = await fetchImpl(url, init);
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as unknown;
      const record = typeof data === 'object' && data ? (data as Record<string, unknown>) : null;
      if (!record) return null;

      const listKey = input.kind === 'movie' ? 'movie_results' : 'tv_results';
      const list = record[listKey];
      if (!Array.isArray(list) || !list.length) return null;

      const first = list[0];
      const firstRec = typeof first === 'object' && first ? (first as Record<string, unknown>) : null;
      const idValue = firstRec?.id;
      const tmdbId = typeof idValue === 'number' ? Math.trunc(idValue) : typeof idValue === 'string' ? Number.parseInt(idValue, 10) : NaN;
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) return null;

      return { provider: 'tmdb', kind: input.kind, id: tmdbId };
    },
  };
}
