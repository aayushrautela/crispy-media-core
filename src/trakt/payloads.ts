import type { TraktIds } from './types';
import type { TraktRatingPayload, TraktSyncPayload } from './apiTypes';
import { getTraktIdsObject, isValidTraktIdsObject } from './scrobble';

export type TraktSyncItemType = 'movie' | 'show' | 'episode';

function assertValidIds(ids: TraktIds, context: string): void {
  if (!isValidTraktIdsObject(ids)) {
    throw new Error(`[media-core][trakt] Invalid ids for ${context}`);
  }
}

function makeSyncPayload(type: TraktSyncItemType, ids: TraktIds): TraktSyncPayload {
  if (type === 'movie') {
    return { movies: [{ ids }] };
  }
  if (type === 'show') {
    return { shows: [{ ids }] };
  }
  return { episodes: [{ ids }] };
}

export function buildTraktSyncPayload(type: TraktSyncItemType, ids: TraktIds): TraktSyncPayload {
  assertValidIds(ids, `sync payload (${type})`);
  return makeSyncPayload(type, ids);
}

export function tryBuildTraktSyncPayloadFromId(type: TraktSyncItemType, id: string | number): TraktSyncPayload | null {
  const ids = getTraktIdsObject(id);
  if (!isValidTraktIdsObject(ids)) return null;
  return makeSyncPayload(type, ids);
}

export function buildTraktRatingPayload(type: TraktSyncItemType, ids: TraktIds, rating: number, ratedAt?: string): TraktRatingPayload {
  assertValidIds(ids, `rating payload (${type})`);
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    throw new Error('[media-core][trakt] Rating must be between 1 and 10');
  }

  const item = ratedAt ? { ids, rating, rated_at: ratedAt } : { ids, rating };

  if (type === 'movie') {
    return { movies: [item] };
  }
  if (type === 'show') {
    return { shows: [item] };
  }
  return { episodes: [item] };
}

export function tryBuildTraktRatingPayloadFromId(type: TraktSyncItemType, id: string | number, rating: number, ratedAt?: string): TraktRatingPayload | null {
  const ids = getTraktIdsObject(id);
  if (!isValidTraktIdsObject(ids)) return null;
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) return null;
  return buildTraktRatingPayload(type, ids, rating, ratedAt);
}
