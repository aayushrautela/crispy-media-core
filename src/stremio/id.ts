import type { ExternalIds } from '../domain/media';

import { buildCanonicalId, mergeExternalIds, parseExternalId, type NumericIdAssumption } from '../ids/externalIds';

function parsePositiveInt(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }

  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export interface EpisodeIdSuffix {
  baseId: string;
  season?: number;
  episode?: number;
}

/**
 * Parses Stremio-style episode suffixes like `tt1234567:1:2` or `tmdb:1399:1:2`.
 *
 * Notes:
 * - The base id itself may contain `:` (e.g. `tmdb:1399`).
 * - Only the last two `:`-separated tokens are treated as `<season>:<episode>`.
 */
export function parseEpisodeIdSuffix(id: string): EpisodeIdSuffix {
  const raw = id.trim();
  if (!raw) return { baseId: id };

  const parts = raw.split(':');
  if (parts.length < 3) return { baseId: raw };

  const last = parts[parts.length - 1] ?? '';
  const secondLast = parts[parts.length - 2] ?? '';

  const episode = parsePositiveInt(last);
  const season = parsePositiveInt(secondLast);
  if (!season || !episode) return { baseId: raw };

  const baseId = parts.slice(0, -2).join(':');
  if (!baseId) return { baseId: raw };

  return { baseId, season, episode };
}

export function buildEpisodeId(baseId: string, season: number, episode: number): string | null {
  const trimmed = baseId.trim();
  if (!trimmed) return null;

  const s = Math.trunc(season);
  const e = Math.trunc(episode);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s <= 0 || e <= 0) {
    return null;
  }

  return `${trimmed}:${s}:${e}`;
}

export interface NormalizeStremioIdOptions {
  /**
   * Controls how bare numeric inputs are interpreted.
   * Default is strict ('none') for cross-app safety.
   */
  assumeNumeric?: NumericIdAssumption;

  /**
   * Enables a very permissive IMDb normalization for messy inputs.
   *
   * Disabled by default to avoid accidentally treating arbitrary numerics as IMDb IDs.
   */
  looseImdb?: boolean;
}

function normalizeImdbIdLoose(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const noPrefix = trimmed.toLowerCase().startsWith('imdb:') ? trimmed.slice('imdb:'.length) : trimmed;
  const token = noPrefix.split(':')[0]?.trim() || '';
  if (!token) return undefined;

  if (/^tt\d+$/i.test(token)) return token.toLowerCase();
  if (/^\d+$/.test(token)) return `tt${token}`;
  return undefined;
}

/**
 * Normalizes arbitrary id inputs into a Stremio-style content id.
 *
 * Output examples:
 * - `tt0137523`
 * - `tt0944947:1:2`
 * - `tmdb:1399`
 * - `tmdb:1399:1:2`
 */
export function normalizeStremioId(input: string | number, options: NormalizeStremioIdOptions = {}): string | null {
  const assumeNumeric: NumericIdAssumption = options.assumeNumeric ?? 'none';

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;

    const ids = parseExternalId(input, { assumeNumeric });
    const base = buildCanonicalId(ids);

    if (base) return base;
    return String(input);
  }

  const trimmed = input.trim();
  if (!trimmed) return null;

  const suffix = parseEpisodeIdSuffix(trimmed);
  const baseId = suffix.baseId.trim();

  const strictIds = parseExternalId(baseId, { assumeNumeric });
  const looseImdb = options.looseImdb && !strictIds.imdb ? normalizeImdbIdLoose(baseId) : undefined;
  const ids: ExternalIds = mergeExternalIds(strictIds, looseImdb ? { imdb: looseImdb } : {});

  const canonicalBase = buildCanonicalId(ids, baseId);
  if (!canonicalBase) return null;

  if (typeof suffix.season === 'number' && typeof suffix.episode === 'number') {
    return `${canonicalBase}:${suffix.season}:${suffix.episode}`;
  }

  return canonicalBase;
}
