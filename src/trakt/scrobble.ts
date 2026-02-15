import type { TraktIds } from './types';
import { normalizeIdForKey, parseEpisodeIdSuffix, parseMediaIdInput } from '../ids/mediaId';

export type WatchingKeyType = 'movie' | 'series';

export type TraktIdsObject = TraktIds;

export function buildWatchingKey(type: WatchingKeyType, id: string | number, season?: number, episode?: number): string {
  const normalizedId = normalizeIdForKey(id);
  const baseId = parseEpisodeIdSuffix(normalizedId).baseId;

  if (type === 'series') {
    if (typeof season === 'number' && typeof episode === 'number' && season > 0 && episode > 0) {
      return `episode:${baseId}:${season}:${episode}`;
    }
    return `episode:${baseId}`;
  }

  return `movie:${baseId}`;
}

export function getTraktIdsObject(id: string | number): TraktIdsObject {
  const parsed = parseMediaIdInput(id);
  return parsed.ids as TraktIdsObject;
}

export function isValidTraktIdsObject(ids: unknown): ids is Required<Pick<TraktIdsObject, 'imdb'>> | Required<Pick<TraktIdsObject, 'tmdb'>> | Required<Pick<TraktIdsObject, 'trakt'>> {
  if (!ids || typeof ids !== 'object') return false;
  const anyIds = ids as { trakt?: unknown; tmdb?: unknown; imdb?: unknown; tvdb?: unknown; slug?: unknown };
  if (typeof anyIds.trakt === 'number' && Number.isFinite(anyIds.trakt) && anyIds.trakt > 0) return true;
  if (typeof anyIds.tmdb === 'number' && Number.isFinite(anyIds.tmdb) && anyIds.tmdb > 0) return true;
  if (typeof anyIds.tvdb === 'number' && Number.isFinite(anyIds.tvdb) && anyIds.tvdb > 0) return true;
  if (typeof anyIds.imdb === 'string' && /^tt\d+$/i.test(anyIds.imdb)) return true;
  if (typeof anyIds.slug === 'string' && anyIds.slug.trim().length > 0) return true;
  return false;
}
