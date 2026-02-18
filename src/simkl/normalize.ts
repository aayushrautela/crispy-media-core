import { type EpisodeInfo, type ExternalIds, type ImageSet, type MediaCore, type MediaType } from '../domain/media';
import { buildCanonicalId, normalizeImdbId } from '../ids/externalIds';
import type { SimklIdsRaw, SimklItemType } from './types';
import { buildSimklFanartUrl, buildSimklFanartUrls, buildSimklPosterUrl, buildSimklPosterUrls } from './images';

export type NormalizedSimklType = SimklItemType | 'episode';

export interface NormalizedSimklItem extends MediaCore {
  simklType: NormalizedSimklType;
  playbackProgress?: number;
  pausedAt?: string;
  episode?: EpisodeInfo;
  showTitle?: string;
  /** Playback session id returned by `/sync/playback`. */
  simklPlaybackId?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumberLike(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readFloatLike(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function normalizeSimklType(value: string | undefined): NormalizedSimklType | undefined {
  if (!value) return undefined;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'movie' || lowered === 'tv' || lowered === 'anime' || lowered === 'episode') {
    return lowered as NormalizedSimklType;
  }
  return undefined;
}

function simklTypeToMediaType(simklType: NormalizedSimklType): MediaType {
  return simklType === 'movie' ? 'movie' : 'series';
}

function extractIds(value: unknown): ExternalIds {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const raw = record as SimklIdsRaw;
  const ids: ExternalIds = {};

  const simklValue = raw.simkl ?? raw.simkl_id;
  if (typeof simklValue === 'number' && Number.isFinite(simklValue) && simklValue > 0) {
    ids.simkl = Math.trunc(simklValue);
  } else if (typeof simklValue === 'string' && simklValue.trim()) {
    const parsed = Number.parseInt(simklValue.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      ids.simkl = parsed;
    }
  }

  const tmdb = typeof raw.tmdb === 'number'
    ? raw.tmdb
    : typeof raw.tmdb === 'string'
      ? Number.parseInt(raw.tmdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tmdb) && tmdb > 0) {
    ids.tmdb = Math.trunc(tmdb);
  }

  const tvdb = typeof raw.tvdb === 'number'
    ? raw.tvdb
    : typeof raw.tvdb === 'string'
      ? Number.parseInt(raw.tvdb.trim(), 10)
      : NaN;
  if (Number.isFinite(tvdb) && tvdb > 0) {
    ids.tvdb = Math.trunc(tvdb);
  }

  const imdb = normalizeImdbId(typeof raw.imdb === 'string' ? raw.imdb : undefined);
  if (imdb) {
    ids.imdb = imdb;
  }

  const slug = typeof raw.slug === 'string' && raw.slug.trim() ? raw.slug.trim() : undefined;
  if (slug) {
    ids.slug = slug;
  }

  return ids;
}

function extractImages(record: Record<string, unknown>): ImageSet {
  const images: ImageSet = {};

  const posterPath = readString(record, 'poster');
  if (posterPath) {
    const poster = buildSimklPosterUrl(posterPath);
    if (poster) {
      images.poster = poster;
    }

    const posters = buildSimklPosterUrls(posterPath);
    if (posters.length) {
      images.posters = posters;
    }
  }

  const fanartPath = readString(record, 'fanart');
  if (fanartPath) {
    const backdrop = buildSimklFanartUrl(fanartPath);
    if (backdrop) {
      images.backdrop = backdrop;
    }

    const backdrops = buildSimklFanartUrls(fanartPath);
    if (backdrops.length) {
      images.backdrops = backdrops;
    }
  }

  return images;
}

function extractEpisodeInfo(episode: Record<string, unknown> | null): EpisodeInfo | undefined {
  if (!episode) return undefined;

  const season = readNumberLike(episode, 'season');
  const ep = readNumberLike(episode, 'episode') ?? readNumberLike(episode, 'number');
  if (!season || !ep) return undefined;

  const details: EpisodeInfo = { season, episode: ep };

  const title = readString(episode, 'title');
  if (title) {
    details.title = title;
  }

  return details;
}

export function normalizeSimklItem(input: unknown): NormalizedSimklItem | null {
  const source = asRecord(input);
  if (!source) {
    return null;
  }

  const movie = asRecord(source.movie);
  const show = asRecord(source.show);
  const episode = asRecord(source.episode);

  const detectedType = normalizeSimklType(readString(source, 'type'));

  let simklType: NormalizedSimklType = detectedType ?? (episode ? 'episode' : movie ? 'movie' : show ? 'tv' : 'movie');
  let type: MediaType = simklTypeToMediaType(simklType);
  let title = readString(source, 'title') ?? 'Unknown title';
  let year: number | undefined;
  let description: string | undefined;
  let runtimeMinutes: number | undefined;
  let released: string | undefined;
  let status: string | undefined;

  let ids: ExternalIds = {};
  let images: ImageSet = {};
  let episodeInfo: EpisodeInfo | undefined;
  let showTitle: string | undefined;

  if (episode) {
    simklType = 'episode';
    type = 'series';

    const showIds = extractIds(show?.ids);
    ids = showIds;

    showTitle = show ? readString(show, 'title') : undefined;
    title = showTitle ?? title;
    year = show ? readNumberLike(show, 'year') : undefined;
    status = show ? readString(show, 'status') : undefined;

    images = show ? extractImages(show) : {};
    episodeInfo = extractEpisodeInfo(episode);
  } else if (show) {
    // `tv` and `anime` map to `series`.
    type = 'series';
    simklType = detectedType === 'anime' ? 'anime' : 'tv';

    ids = extractIds(show.ids);
    title = readString(show, 'title') ?? title;
    year = readNumberLike(show, 'year');
    description = readString(show, 'overview');
    runtimeMinutes = readNumberLike(show, 'runtime');
    released = readString(show, 'first_aired');
    status = readString(show, 'status');
    images = extractImages(show);
  } else if (movie) {
    type = 'movie';
    simklType = 'movie';

    ids = extractIds(movie.ids);
    title = readString(movie, 'title') ?? title;
    year = readNumberLike(movie, 'year');
    description = readString(movie, 'overview');
    runtimeMinutes = readNumberLike(movie, 'runtime');
    released = readString(movie, 'released');
    status = readString(movie, 'status');
    images = extractImages(movie);
  } else {
    // Search/id style item or other flat item.
    simklType = detectedType ?? 'movie';
    type = simklTypeToMediaType(simklType);

    ids = extractIds(source.ids);
    title = readString(source, 'title') ?? title;
    year = readNumberLike(source, 'year');
    description = readString(source, 'overview');
    runtimeMinutes = readNumberLike(source, 'runtime');
    status = readString(source, 'status');
    images = extractImages(source);
  }

  const fallbackId = showTitle && title !== showTitle ? `${title}:${showTitle}` : title;

  let id = buildCanonicalId(ids, fallbackId) ?? fallbackId;
  if (simklType === 'episode' && episodeInfo) {
    id = `${id}:${episodeInfo.season}:${episodeInfo.episode}`;
  }

  const normalized: NormalizedSimklItem = {
    id,
    type,
    title,
    ids,
    images,
    simklType,
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

  const progress = readFloatLike(source, 'progress');
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

  const playbackId = readNumberLike(source, 'id');
  if (simklType === 'episode' || simklType === 'movie') {
    if (playbackId && pausedAt && progress !== undefined) {
      normalized.simklPlaybackId = playbackId;
    }
  }

  return normalized;
}
