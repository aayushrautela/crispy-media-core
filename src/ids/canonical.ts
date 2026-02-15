import type { ExternalIds, MediaType } from '../domain/media';
import { formatProviderRef, mediaTypeToProviderKind, type ProviderKind, type ProviderRef } from './providerRef';

function formatFromIds(provider: ProviderRef['provider'], kind: ProviderKind, id: number | string): string {
  if (provider === 'imdb') {
    return formatProviderRef({ provider: 'imdb', kind, id: String(id) });
  }
  return formatProviderRef({ provider, kind, id: Number(id) });
}

/**
 * Builds a typed, collision-resistant media id: `provider:kind:id`.
 */
export function buildCanonicalMediaId(ids: ExternalIds, kind: ProviderKind, fallback?: string): string | null {
  if (ids.imdb) return formatFromIds('imdb', kind, ids.imdb);
  if (ids.tmdb) return formatFromIds('tmdb', kind, ids.tmdb);
  if (ids.trakt) return formatFromIds('trakt', kind, ids.trakt);
  if (ids.tvdb) return formatFromIds('tvdb', kind, ids.tvdb);
  if (ids.simkl) return formatFromIds('simkl', kind, ids.simkl);

  if (!fallback) return null;
  const trimmed = fallback.trim();
  return trimmed ? trimmed : null;
}

export function buildCanonicalMediaIdFromMediaType(ids: ExternalIds, mediaType: MediaType, fallback?: string): string | null {
  const kind = mediaTypeToProviderKind(mediaType);
  return buildCanonicalMediaId(ids, kind, fallback);
}

export { mediaTypeToProviderKind, type ProviderKind };
