import { type EpisodeInfo, type ExternalIds, type ImageSet, type MediaType, type MediaCore } from '../domain/media';
import { mergeExternalIds, normalizeImdbId, normalizeMediaType } from '../ids/externalIds';
import { buildCanonicalMediaId, mediaTypeToProviderKind } from '../ids/canonical';
import { type TraktImages, type TraktWrappedItem } from './types';

const HTTP_PATTERN = /^https?:\/\//i;

export interface NormalizedTraktItem extends MediaCore {
  traktType: 'movie' | 'show' | 'episode';
  playbackProgress?: number;
  pausedAt?: string;
  episode?: EpisodeInfo;
  showTitle?: string;
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

  if (HTTP_PATTERN.test(value)) {
    return value;
  }

  if (value.startsWith('//')) {
    return `https:${value}`;
  }

  if (value.startsWith('/http')) {
    return `https:${value.slice(1)}`;
  }

  if (value.startsWith('/')) {
    return `https://image.tmdb.org/t/p/original${value}`;
  }

  return undefined;
}

function firstImageValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return normalizeImageUrl(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
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

  const tvdb = readNumber(record, 'tvdb');
  if (tvdb) {
    ids.tvdb = tvdb;
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

function mergeImageSets(primary: ImageSet, secondary: ImageSet): ImageSet {
  const merged: ImageSet = {};

  const poster = primary.poster ?? secondary.poster;
  if (poster) {
    merged.poster = poster;
  }

  const backdrop = primary.backdrop ?? secondary.backdrop;
  if (backdrop) {
    merged.backdrop = backdrop;
  }

  const logo = primary.logo ?? secondary.logo;
  if (logo) {
    merged.logo = logo;
  }

  const fanart = primary.fanart ?? secondary.fanart;
  if (fanart) {
    merged.fanart = fanart;
  }

  const thumbnail = primary.thumbnail ?? secondary.thumbnail;
  if (thumbnail) {
    merged.thumbnail = thumbnail;
  }

  return merged;
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
    ids = mergeExternalIds(episodeIds, showIds);

    showTitle = show ? readString(show, 'title') : undefined;
    title = showTitle ?? readString(episode, 'title') ?? title;
    year = show ? readNumber(show, 'year') : undefined;
    description = readString(episode, 'overview') ?? (show ? readString(show, 'overview') : undefined);
    runtimeMinutes = readNumber(episode, 'runtime') ?? (show ? readNumber(show, 'runtime') : undefined);
    released = readString(episode, 'first_aired') ?? (show ? readString(show, 'first_aired') : undefined);
    status = show ? readString(show, 'status') : undefined;

    const episodeImages = extractImages(episode.images as TraktImages | undefined);
    const showImages = extractImages(show?.images as TraktImages | undefined);
    images = mergeImageSets(episodeImages, showImages);
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

  const fallbackId = showTitle ? `${title}:${showTitle}` : title;
  const providerKind = traktType === 'episode' ? 'episode' : mediaTypeToProviderKind(type);

  let id: string = fallbackId;

  if (traktType === 'episode') {
    // Prefer episode-scoped ids; do not accidentally use show-scoped TMDB/IMDB ids.
    const episodeCanonical = episodeIds ? buildCanonicalMediaId(episodeIds, 'episode') : null;
    if (episodeCanonical) {
      id = episodeCanonical;
    } else if (showIds?.tmdb && episodeInfo) {
      // Stable fallback when episode-scoped ids are missing: show id + season/episode context.
      id = `tmdb:show:${showIds.tmdb}:${episodeInfo.season}:${episodeInfo.episode}`;
    } else {
      id = buildCanonicalMediaId(ids, providerKind, fallbackId) ?? fallbackId;
    }
  } else {
    id = buildCanonicalMediaId(ids, providerKind, fallbackId) ?? fallbackId;
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

  return normalized;
}
