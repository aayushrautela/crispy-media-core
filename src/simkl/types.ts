import type { ExternalIds } from '../domain/media';

export type SimklListType = 'movies' | 'shows' | 'anime';
export type SimklItemType = 'movie' | 'tv' | 'anime';
export type SimklPlaybackType = 'movie' | 'episode';
export type SimklWatchStatus = 'watching' | 'plantowatch' | 'hold' | 'completed' | 'dropped';

/**
 * Raw ids object as returned by Simkl. Different endpoints are inconsistent:
 * - `simkl` vs `simkl_id`
 * - numeric ids sometimes arrive as strings
 */
export interface SimklIdsRaw {
  simkl?: number | string | null;
  simkl_id?: number | string | null;
  slug?: string | null;
  imdb?: string | null;
  tmdb?: number | string | null;
  tvdb?: number | string | null;

  // Anime-only ids (often present on Simkl show objects)
  mal?: number | string | null;
  anidb?: number | string | null;
  anilist?: number | string | null;

  // Other ids may appear depending on source/provider
  [key: string]: unknown;
}

/**
 * Normalized ids used across Crispy clients.
 * Note: only the ids included in `ExternalIds` are guaranteed to propagate
 * to `MediaCore.ids`.
 */
export interface SimklIds extends ExternalIds {
  mal?: number;
  anidb?: number;
  anilist?: number;
}

export type SimklImagePath = string;
