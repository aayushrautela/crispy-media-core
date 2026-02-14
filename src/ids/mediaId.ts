import { buildCanonicalId, mergeExternalIds, parseExternalId } from './externalIds';
import type { ExternalIds } from '../domain/media';

function parsePositiveInt(value: string): number | undefined {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Loose IMDB normalization used when inputs are messy (e.g. imdb:123 or 123).
 * Returns lowercase tt-prefixed IDs.
 */
export function normalizeImdbIdLoose(value: string | null | undefined): string | undefined {
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

export interface EpisodeIdSuffix {
  baseId: string;
  season?: number;
  episode?: number;
}

/**
 * Parses IDs like `tmdb:123:1:2` or `tt1234567:1:2` into base id + season/episode.
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

export interface ParsedMediaIdInput {
  raw: string | number;
  baseId: string;
  ids: ExternalIds;
  canonicalId: string | null;
  season?: number;
  episode?: number;
}

/**
 * Best-effort parser for inputs used across apps.
 * - Recognizes tmdb:/trakt:/imdb: prefixes
 * - Extracts episode suffix (:<season>:<episode>)
 * - Produces canonical ID preference order: imdb -> tmdb -> trakt -> fallback baseId
 */
export function parseMediaIdInput(input: string | number): ParsedMediaIdInput {
  if (typeof input === 'number') {
    const ids = parseExternalId(input);
    return {
      raw: input,
      baseId: String(input),
      ids,
      canonicalId: buildCanonicalId(ids, ids.tmdb ? `tmdb:${ids.tmdb}` : undefined),
    };
  }

  const trimmed = input.trim();
  const parsedSuffix = parseEpisodeIdSuffix(trimmed);
  const baseId = parsedSuffix.baseId.trim();

  const strictIds = parseExternalId(baseId);
  const looseImdb = strictIds.imdb ? undefined : normalizeImdbIdLoose(baseId);

  const ids = mergeExternalIds(strictIds, looseImdb ? { imdb: looseImdb } : {});
  const canonicalId = buildCanonicalId(ids, baseId);

  const result: ParsedMediaIdInput = {
    raw: input,
    baseId,
    ids,
    canonicalId,
  };

  if (typeof parsedSuffix.season === 'number') {
    result.season = parsedSuffix.season;
  }
  if (typeof parsedSuffix.episode === 'number') {
    result.episode = parsedSuffix.episode;
  }

  return result;
}

/**
 * Normalizes user-provided IDs into stable keys for in-memory maps.
 */
export function normalizeIdForKey(id: string | number): string {
  const parsed = parseMediaIdInput(id);
  return parsed.canonicalId || parsed.baseId;
}
