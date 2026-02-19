import type { ExternalIds } from '../domain/media';
import { parseMediaIdInput } from '../ids/mediaId';
import type {
  SimklHistoryEpisodeItem,
  SimklHistoryMovieItem,
  SimklHistorySeasonItem,
  SimklHistoryShowItem,
  SimklSyncHistoryPayload,
  SimklSyncHistoryRemovePayload,
} from './apiTypes';
import { normalizeImdbId } from '../ids/externalIds';
import type { SimklIdsRaw, SimklWatchStatus } from './types';

export type SimklSyncItemType = 'movie' | 'show' | 'episode';

export type SimklIdsObject = ExternalIds;

export interface SimklMemo {
  text: string;
  isPrivate?: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isValidSimklIdsObject(ids: unknown): ids is Required<Pick<SimklIdsObject, 'simkl'>> | Required<Pick<SimklIdsObject, 'imdb'>> | Required<Pick<SimklIdsObject, 'tmdb'>> {
  if (!ids || typeof ids !== 'object') return false;
  const anyIds = ids as { simkl?: unknown; tmdb?: unknown; imdb?: unknown; slug?: unknown };
  if (typeof anyIds.simkl === 'number' && Number.isFinite(anyIds.simkl) && anyIds.simkl > 0) return true;
  if (typeof anyIds.tmdb === 'number' && Number.isFinite(anyIds.tmdb) && anyIds.tmdb > 0) return true;
  if (typeof anyIds.imdb === 'string' && /^tt\d+$/i.test(anyIds.imdb)) return true;
  if (typeof anyIds.slug === 'string' && anyIds.slug.trim().length > 0) return true;
  return false;
}

function assertValidIds(ids: SimklIdsObject, context: string): void {
  if (!isValidSimklIdsObject(ids)) {
    throw new Error(`[media-core][simkl] Invalid ids for ${context}`);
  }
}

function normalizeIdsForPayload(ids: SimklIdsObject): SimklIdsRaw {
  const payload: SimklIdsRaw = {};

  if (typeof ids.simkl === 'number' && Number.isFinite(ids.simkl) && ids.simkl > 0) {
    payload.simkl = Math.trunc(ids.simkl);
  }

  if (typeof ids.tmdb === 'number' && Number.isFinite(ids.tmdb) && ids.tmdb > 0) {
    payload.tmdb = Math.trunc(ids.tmdb);
  }

  const imdb = normalizeImdbId(ids.imdb);
  if (imdb) {
    payload.imdb = imdb;
  }

  if (isNonEmptyString(ids.slug)) {
    payload.slug = ids.slug.trim();
  }

  return payload;
}

export interface SimklHistoryAddOptions {
  watchedAt?: string;
  addedAt?: string;
  rating?: number;
  memo?: SimklMemo;
  status?: SimklWatchStatus;
}

export function getSimklIdsObject(id: string | number): SimklIdsObject {
  return parseMediaIdInput(id).ids as SimklIdsObject;
}

export function buildSimklHistoryAddPayload(type: SimklSyncItemType, ids: SimklIdsObject, options: SimklHistoryAddOptions = {}): SimklSyncHistoryPayload {
  assertValidIds(ids, `history add payload (${type})`);

  const idsPayload = normalizeIdsForPayload(ids);
  const watchedAt = isNonEmptyString(options.watchedAt) ? options.watchedAt.trim() : undefined;
  const addedAt = isNonEmptyString(options.addedAt) ? options.addedAt.trim() : undefined;

  if (typeof options.rating === 'number') {
    const rating = Math.trunc(options.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
      throw new Error('[media-core][simkl] Rating must be between 1 and 10');
    }
  }

  if (type === 'movie') {
    const movie: SimklHistoryMovieItem = { ids: idsPayload };
    if (watchedAt) movie.watched_at = watchedAt;
    if (addedAt) movie.added_at = addedAt;
    if (typeof options.rating === 'number') movie.rating = Math.trunc(options.rating);
    if (options.memo?.text && options.memo.text.trim()) {
      movie.memo = { text: options.memo.text.trim(), is_private: options.memo.isPrivate === true };
    }
    return { movies: [movie] };
  }

  if (type === 'show') {
    const show: SimklHistoryShowItem = { ids: idsPayload };
    if (options.status) show.status = options.status;
    return { shows: [show] };
  }

  const episode: SimklHistoryEpisodeItem = { ids: idsPayload };
  if (watchedAt) episode.watched_at = watchedAt;
  return { episodes: [episode] };
}

export function tryBuildSimklHistoryAddPayloadFromId(type: SimklSyncItemType, id: string | number, options: SimklHistoryAddOptions = {}): SimklSyncHistoryPayload | null {
  const ids = getSimklIdsObject(id);
  if (!isValidSimklIdsObject(ids)) return null;
  try {
    return buildSimklHistoryAddPayload(type, ids, options);
  } catch {
    return null;
  }
}

export function buildSimklShowEpisodeHistoryAddPayload(showIds: SimklIdsObject, season: number, episode: number, watchedAt?: string): SimklSyncHistoryPayload {
  assertValidIds(showIds, 'show episode history add payload');
  if (!Number.isFinite(season) || season <= 0 || !Number.isFinite(episode) || episode <= 0) {
    throw new Error('[media-core][simkl] season and episode must be positive integers');
  }

  const idsPayload = normalizeIdsForPayload(showIds);
  const seasonNumber = Math.trunc(season);
  const episodeNumber = Math.trunc(episode);

  const seasonItem: SimklHistorySeasonItem = {
    number: seasonNumber,
    episodes: [{ number: episodeNumber }],
  };

  if (isNonEmptyString(watchedAt)) {
    seasonItem.watched_at = watchedAt.trim();
  }

  return {
    shows: [
      {
        ids: idsPayload,
        seasons: [seasonItem],
      },
    ],
  };
}

export function buildSimklHistoryRemovePayload(type: SimklSyncItemType, ids: SimklIdsObject): SimklSyncHistoryRemovePayload {
  assertValidIds(ids, `history remove payload (${type})`);
  const idsPayload = normalizeIdsForPayload(ids);

  if (type === 'movie') {
    const movie: SimklHistoryMovieItem = { ids: idsPayload };
    return { movies: [movie] };
  }

  if (type === 'show') {
    const show: SimklHistoryShowItem = { ids: idsPayload };
    return { shows: [show] };
  }

  const episode: SimklHistoryEpisodeItem = { ids: idsPayload };
  return { episodes: [episode] };
}

export function tryBuildSimklHistoryRemovePayloadFromId(type: SimklSyncItemType, id: string | number): SimklSyncHistoryRemovePayload | null {
  const ids = getSimklIdsObject(id);
  if (!isValidSimklIdsObject(ids)) return null;
  try {
    return buildSimklHistoryRemovePayload(type, ids);
  } catch {
    return null;
  }
}

export function buildSimklShowEpisodeHistoryRemovePayload(showIds: SimklIdsObject, season: number, episode?: number): SimklSyncHistoryRemovePayload {
  assertValidIds(showIds, 'show episode history remove payload');
  if (!Number.isFinite(season) || season <= 0) {
    throw new Error('[media-core][simkl] season must be a positive integer');
  }

  const idsPayload = normalizeIdsForPayload(showIds);
  const seasonNumber = Math.trunc(season);

  const seasonItem: SimklHistorySeasonItem = { number: seasonNumber };
  if (typeof episode === 'number') {
    if (!Number.isFinite(episode) || episode <= 0) {
      throw new Error('[media-core][simkl] episode must be a positive integer');
    }
    seasonItem.episodes = [{ number: Math.trunc(episode) }];
  }

  return {
    shows: [
      {
        ids: idsPayload,
        seasons: [seasonItem],
      },
    ],
  };
}
