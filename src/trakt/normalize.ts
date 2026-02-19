import { type EpisodeInfo, type ExternalIds, type ImageSet, type MediaType, type MediaCore } from '../domain/media';
import { buildCanonicalId, normalizeImdbId, normalizeMediaType } from '../ids/externalIds';
import { type TraktImages, type TraktWrappedItem } from './types';

const HTTP_PATTERN = /^https?:\/\//i;
const HOST_WITH_PATH_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i;
const TRAKT_WALTER_BASE_URL = 'https://walter.trakt.tv';

export interface NormalizedTraktItem extends MediaCore {
  traktType: 'movie' | 'show' | 'episode';
  playbackProgress?: number;
  pausedAt?: string;
  episode?: EpisodeInfo;
  showTitle?: string;

  /** Show-level ids when the source is an episode item. */
  showIds?: ExternalIds;
  /** Episode-level ids when the source is an episode item. */
  episodeIds?: ExternalIds;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeImageUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return undefined;
  }

  if (HTTP_PATTERN.test(normalizedValue)) {
    return normalizedValue;
  }

  if (normalizedValue.startsWith('//')) {
    return `https:${normalizedValue}`;
  }

  if (normalizedValue.startsWith('/http')) {
    return `https:${normalizedValue.slice(1)}`;
  }

  if (normalizedValue.startsWith('/images')) {
    return `${TRAKT_WALTER_BASE_URL}${normalizedValue}`;
  }

  if (normalizedValue.startsWith('/')) {
    return `https://image.tmdb.org/t/p/original${normalizedValue}`;
  }

  if (HOST_WITH_PATH_PATTERN.test(normalizedValue)) {
    return `https://${normalizedValue}`;
  }

  return undefined;
}

function firstImageValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return normalizeImageUrl(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') {
        const normalized = normalizeImageUrl(entry);
        if (normalized) {
          return normalized;
        }

        continue;
      }

      const record = asRecord(entry);
      if (!record) {
        continue;
      }

      const candidate =
        readString(record, 'full') ?? readString(record, 'medium') ?? readString(record, 'thumb') ?? readString(record, 'url');

      const normalized = normalizeImageUrl(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return normalizeImageUrl(
    readString(record, 'full') ?? readString(record, 'medium') ?? readString(record, 'thumb') ?? readString(record, 'url')
  );
}

function extractImages(images: TraktImages | undefined): ImageSet {
  const normalized: ImageSet = {};

  if (!images) {
    return normalized;
  }

  const poster = firstImageValue(images.poster);
  if (poster) {
    normalized.poster = poster;
  }

  const backdrop = firstImageValue(images.fanart);
  if (backdrop) {
    normalized.backdrop = backdrop;
  }

  const logo = firstImageValue(images.logo);
  if (logo) {
    normalized.logo = logo;
  }

  const thumbnail = firstImageValue(images.thumb);
  if (thumbnail) {
    normalized.thumbnail = thumbnail;
  }

  return normalized;
}

function extractIds(value: unknown): ExternalIds {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const ids: ExternalIds = {};

  const trakt = readNumber(record, 'trakt');
  if (trakt) {
    ids.trakt = trakt;
  }

  const tmdb = readNumber(record, 'tmdb');
  if (tmdb) {
    ids.tmdb = tmdb;
  }

  const imdb = normalizeImdbId(readString(record, 'imdb'));
  if (imdb) {
    ids.imdb = imdb;
  }

  const slug = readString(record, 'slug');
  if (slug) {
    ids.slug = slug;
  }

  return ids;
}

function extractMediaType(value: unknown): MediaType {
  const record = asRecord(value);
  const normalized = normalizeMediaType(record ? readString(record, 'type') : undefined);
  return normalized ?? 'movie';
}

function extractEpisodeInfo(episode: Record<string, unknown> | null): EpisodeInfo | undefined {
  if (!episode) {
    return undefined;
  }

  const season = readNumber(episode, 'season');
  const number = readNumber(episode, 'number');
  if (!season || !number) {
    return undefined;
  }

  const details: EpisodeInfo = {
    season,
    episode: number,
  };

  const title = readString(episode, 'title');
  if (title) {
    details.title = title;
  }

  const overview = readString(episode, 'overview');
  if (overview) {
    details.overview = overview;
  }

  const runtime = readNumber(episode, 'runtime');
  if (runtime) {
    details.runtimeMinutes = runtime;
  }

  const firstAired = readString(episode, 'first_aired');
  if (firstAired) {
    details.releaseDate = firstAired;
  }

  return details;
}

export function normalizeTraktItem(input: TraktWrappedItem): NormalizedTraktItem | null {
  const source = asRecord(input);
  if (!source) {
    return null;
  }

  const movie = asRecord(source.movie);
  const show = asRecord(source.show);
  const episode = asRecord(source.episode);

  let traktType: NormalizedTraktItem['traktType'] = 'movie';
  let type: MediaType = 'movie';
  let title = 'Unknown title';
  let year: number | undefined;
  let description: string | undefined;
  let runtimeMinutes: number | undefined;
  let released: string | undefined;
  let status: string | undefined;

  let ids: ExternalIds = {};
  let episodeIds: ExternalIds | undefined;
  let showIds: ExternalIds | undefined;
  let images: ImageSet = {};
  let episodeInfo: EpisodeInfo | undefined;
  let showTitle: string | undefined;

  if (episode) {
    traktType = 'episode';
    type = 'series';

    episodeIds = extractIds(episode.ids);
    showIds = extractIds(show?.ids);

    // IMPORTANT: For episode items we keep `ids` as show-level ids.
    // Trakt may include episode-scoped TMDB/IMDb ids; using them at the top-level
    // leads to incorrect lookups (e.g. treating episode tmdb id as show tmdb id).
    ids = showIds;

    showTitle = show ? readString(show, 'title') : undefined;
    title = showTitle ?? readString(episode, 'title') ?? title;
    year = show ? readNumber(show, 'year') : undefined;
    description = readString(episode, 'overview') ?? (show ? readString(show, 'overview') : undefined);
    runtimeMinutes = readNumber(episode, 'runtime') ?? (show ? readNumber(show, 'runtime') : undefined);
    released = readString(episode, 'first_aired') ?? (show ? readString(show, 'first_aired') : undefined);
    status = show ? readString(show, 'status') : undefined;

    const episodeImages = extractImages(episode.images as TraktImages | undefined);
    const showImages = extractImages(show?.images as TraktImages | undefined);

    // Keep show artwork stable; attach episode screenshot as thumbnail when available.
    images = showImages;
    const thumbnail = episodeImages.thumbnail ?? showImages.thumbnail;
    if (thumbnail) {
      images.thumbnail = thumbnail;
    }

    episodeInfo = extractEpisodeInfo(episode);
  } else if (show) {
    traktType = 'show';
    type = 'series';

    ids = extractIds(show.ids);
    title = readString(show, 'title') ?? title;
    year = readNumber(show, 'year');
    description = readString(show, 'overview');
    runtimeMinutes = readNumber(show, 'runtime');
    released = readString(show, 'first_aired');
    status = readString(show, 'status');

    images = extractImages(show.images as TraktImages | undefined);
  } else if (movie) {
    traktType = 'movie';
    type = 'movie';

    ids = extractIds(movie.ids);
    title = readString(movie, 'title') ?? title;
    year = readNumber(movie, 'year');
    description = readString(movie, 'overview');
    runtimeMinutes = readNumber(movie, 'runtime');
    released = readString(movie, 'released');
    status = readString(movie, 'status');

    images = extractImages(movie.images as TraktImages | undefined);
  } else {
    type = extractMediaType(source);
    traktType = type === 'series' ? 'show' : 'movie';

    ids = extractIds(source.ids);
    title = readString(source, 'title') ?? title;
    year = readNumber(source, 'year');
    description = readString(source, 'overview');
    runtimeMinutes = readNumber(source, 'runtime');
    released = readString(source, 'released') ?? readString(source, 'first_aired');
    status = readString(source, 'status');
    images = extractImages(source.images as TraktImages | undefined);
  }

  const fallbackId = showTitle && title !== showTitle ? `${title}:${showTitle}` : title;

  let id: string = fallbackId;

  if (traktType === 'episode') {
    const showCanonical = buildCanonicalId(showIds ?? {}, fallbackId);

    if (showCanonical && episodeInfo) {
      id = `${showCanonical}:${episodeInfo.season}:${episodeInfo.episode}`;
    } else if (showCanonical) {
      id = showCanonical;
    } else {
      // Last resort: fall back to episode-scoped ids (if the show is unavailable).
      id = (episodeIds ? buildCanonicalId(episodeIds, fallbackId) : null) ?? fallbackId;
    }
  } else {
    id = buildCanonicalId(ids, fallbackId) ?? fallbackId;
  }

  const normalized: NormalizedTraktItem = {
    id,
    type,
    title,
    ids,
    images,
    traktType,
  };

  if (year) {
    normalized.year = year;
  }

  if (description) {
    normalized.description = description;
  }

  if (runtimeMinutes) {
    normalized.runtimeMinutes = runtimeMinutes;
  }

  if (released) {
    normalized.released = released;
  }

  if (status) {
    normalized.status = status;
  }

  const rating = readNumber(source, 'rating') ?? (movie ? readNumber(movie, 'rating') : undefined) ?? (show ? readNumber(show, 'rating') : undefined);
  if (rating !== undefined) {
    normalized.rating = rating;
  }

  const progress = readNumber(source, 'progress');
  if (progress !== undefined) {
    normalized.playbackProgress = progress;
  }

  const pausedAt = readString(source, 'paused_at');
  if (pausedAt) {
    normalized.pausedAt = pausedAt;
  }

  if (episodeInfo) {
    normalized.episode = episodeInfo;
  }

  if (showTitle) {
    normalized.showTitle = showTitle;
  }

  if (showIds) {
    normalized.showIds = showIds;
  }

  if (episodeIds) {
    normalized.episodeIds = episodeIds;
  }

  return normalized;
}
