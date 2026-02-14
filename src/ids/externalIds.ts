import { type ExternalIds, type MediaType } from '../domain/media';

const TMDB_PREFIX = 'tmdb:';
const TRAKT_PREFIX = 'trakt:';
const IMDB_PREFIX = 'imdb:';
const IMDB_PATTERN = /^tt\d+$/i;
const NUMERIC_PATTERN = /^\d+$/;

function toPositiveInteger(value: string): number | undefined {
  if (!NUMERIC_PATTERN.test(value)) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function normalizeMediaType(type: string | null | undefined): MediaType | null {
  if (!type) {
    return null;
  }

  const normalized = type.trim().toLowerCase();

  if (normalized === 'movie' || normalized === 'film') {
    return 'movie';
  }

  if (normalized === 'show' || normalized === 'tv' || normalized === 'series') {
    return 'series';
  }

  return null;
}

export function normalizeImdbId(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (IMDB_PATTERN.test(normalized)) {
    return normalized;
  }

  if (normalized.startsWith(IMDB_PREFIX)) {
    const candidate = normalized.slice(IMDB_PREFIX.length).trim();
    return IMDB_PATTERN.test(candidate) ? candidate : undefined;
  }

  if (normalized.startsWith('tt') && NUMERIC_PATTERN.test(normalized.slice(2))) {
    return normalized;
  }

  return undefined;
}

export function parseExternalId(input: string | number): ExternalIds {
  if (typeof input === 'number') {
    return Number.isFinite(input) && input > 0 ? { tmdb: Math.trunc(input) } : {};
  }

  const value = input.trim();

  if (!value) {
    return {};
  }

  const lowered = value.toLowerCase();

  if (lowered.startsWith(TMDB_PREFIX)) {
    const token = lowered.slice(TMDB_PREFIX.length).split(':')[0] ?? '';
    const tmdb = toPositiveInteger(token);
    return tmdb ? { tmdb } : {};
  }

  if (lowered.startsWith(TRAKT_PREFIX)) {
    const token = lowered.slice(TRAKT_PREFIX.length).split(':')[0] ?? '';
    const trakt = toPositiveInteger(token);
    return trakt ? { trakt } : {};
  }

  const imdb = normalizeImdbId(lowered);
  if (imdb) {
    return { imdb };
  }

  if (NUMERIC_PATTERN.test(lowered)) {
    const tmdb = toPositiveInteger(lowered);
    return tmdb ? { tmdb } : {};
  }

  return {};
}

export function mergeExternalIds(...sources: ExternalIds[]): ExternalIds {
  const merged: ExternalIds = {};

  for (const ids of sources) {
    if (!merged.trakt && ids.trakt) {
      merged.trakt = ids.trakt;
    }
    if (!merged.tmdb && ids.tmdb) {
      merged.tmdb = ids.tmdb;
    }
    if (!merged.tvdb && ids.tvdb) {
      merged.tvdb = ids.tvdb;
    }
    if (!merged.imdb && ids.imdb) {
      merged.imdb = ids.imdb;
    }
    if (!merged.slug && ids.slug) {
      merged.slug = ids.slug;
    }
  }

  return merged;
}

export function buildCanonicalId(ids: ExternalIds, fallback?: string): string | null {
  if (ids.imdb) {
    return ids.imdb;
  }

  if (ids.tmdb) {
    return `tmdb:${ids.tmdb}`;
  }

  if (ids.trakt) {
    return `trakt:${ids.trakt}`;
  }

  if (!fallback) {
    return null;
  }

  const normalized = fallback.trim();
  return normalized ? normalized : null;
}
