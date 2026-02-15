import { type ExternalIds, type MediaType } from '../domain/media';

const TMDB_PREFIX = 'tmdb:';
const TRAKT_PREFIX = 'trakt:';
const TVDB_PREFIX = 'tvdb:';
const SIMKL_PREFIX = 'simkl:';
const IMDB_PREFIX = 'imdb:';
const IMDB_PATTERN = /^tt\d+$/i;
const NUMERIC_PATTERN = /^\d+$/;

export type NumericIdAssumption = 'none' | 'tmdb' | 'trakt' | 'tvdb' | 'simkl';

export interface ParseExternalIdOptions {
  /**
   * Controls how to interpret bare numeric inputs (e.g. `"123"` or `123`).
   * Production default is strict (`'none'`) to avoid mixing providers.
   */
  assumeNumeric?: NumericIdAssumption;
}

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
    const remainder = normalized.slice(IMDB_PREFIX.length).trim();
    // Support both `imdb:tt123` and typed forms like `imdb:movie:tt123`.
    const parts = remainder.split(':').map((part) => part.trim()).filter(Boolean);
    const candidate = parts.length >= 2 ? parts[1] : parts[0];
    return candidate && IMDB_PATTERN.test(candidate) ? candidate : undefined;
  }

  if (normalized.startsWith('tt') && NUMERIC_PATTERN.test(normalized.slice(2))) {
    return normalized;
  }

  return undefined;
}

function isKindToken(token: string): boolean {
  // Keep this intentionally permissive; kinds exist to disambiguate ids across apps.
  return token === 'movie' || token === 'show' || token === 'episode' || token === 'tv' || token === 'series';
}

function extractPrefixedNumericId(remainder: string): number | undefined {
  const parts = remainder.split(':').map((part) => part.trim()).filter(Boolean);
  const first = parts[0] ?? '';
  const second = parts[1] ?? '';

  const direct = toPositiveInteger(first);
  if (direct) {
    return direct;
  }

  if (isKindToken(first)) {
    return toPositiveInteger(second);
  }

  return undefined;
}

function parseNumericAsProvider(n: number, assume: NumericIdAssumption): ExternalIds {
  const value = Math.trunc(n);
  if (!Number.isFinite(value) || value <= 0) {
    return {};
  }

  if (assume === 'tmdb') return { tmdb: value };
  if (assume === 'trakt') return { trakt: value };
  if (assume === 'tvdb') return { tvdb: value };
  if (assume === 'simkl') return { simkl: value };
  return {};
}

export function parseExternalId(input: string | number, options: ParseExternalIdOptions = {}): ExternalIds {
  const assumeNumeric: NumericIdAssumption = options.assumeNumeric ?? 'none';

  if (typeof input === 'number') {
    return parseNumericAsProvider(input, assumeNumeric);
  }

  const value = input.trim();

  if (!value) {
    return {};
  }

  const lowered = value.toLowerCase();

  if (lowered.startsWith(TMDB_PREFIX)) {
    const remainder = lowered.slice(TMDB_PREFIX.length);
    const tmdb = extractPrefixedNumericId(remainder);
    return tmdb ? { tmdb } : {};
  }

  if (lowered.startsWith(TRAKT_PREFIX)) {
    const remainder = lowered.slice(TRAKT_PREFIX.length);
    const trakt = extractPrefixedNumericId(remainder);
    return trakt ? { trakt } : {};
  }

  if (lowered.startsWith(TVDB_PREFIX)) {
    const remainder = lowered.slice(TVDB_PREFIX.length);
    const tvdb = extractPrefixedNumericId(remainder);
    return tvdb ? { tvdb } : {};
  }

  if (lowered.startsWith(SIMKL_PREFIX)) {
    const remainder = lowered.slice(SIMKL_PREFIX.length);
    const simkl = extractPrefixedNumericId(remainder);
    return simkl ? { simkl } : {};
  }

  const imdb = normalizeImdbId(lowered);
  if (imdb) {
    return { imdb };
  }

  if (NUMERIC_PATTERN.test(lowered)) {
    const numeric = toPositiveInteger(lowered);
    return numeric ? parseNumericAsProvider(numeric, assumeNumeric) : {};
  }

  return {};
}

/**
 * Legacy behavior: treats bare numeric inputs as TMDB ids.
 * Prefer `parseExternalId(input)` (strict) in new code.
 */
export function parseExternalIdLegacy(input: string | number): ExternalIds {
  return parseExternalId(input, { assumeNumeric: 'tmdb' });
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
    if (!merged.simkl && ids.simkl) {
      merged.simkl = ids.simkl;
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

  if (ids.tvdb) {
    return `tvdb:${ids.tvdb}`;
  }

  if (ids.simkl) {
    return `simkl:${ids.simkl}`;
  }

  if (!fallback) {
    return null;
  }

  const normalized = fallback.trim();
  return normalized ? normalized : null;
}
