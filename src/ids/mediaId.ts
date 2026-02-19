import type { ExternalIds } from '../domain/media';

import { buildCanonicalId, mergeExternalIds, parseExternalId, type NumericIdAssumption } from './externalIds';
import { parseEpisodeIdSuffix } from '../stremio/id';
import { parseProviderRefLoose, type ProviderKind, type ProviderName } from './providerRef';

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

export { parseEpisodeIdSuffix, type EpisodeIdSuffix } from '../stremio/id';

export interface ParsedMediaIdInput {
  raw: string | number;
  baseId: string;
  ids: ExternalIds;
  canonicalId: string | null;
  season?: number;
  episode?: number;
  provider?: ProviderName;
  kind?: ProviderKind;
}

export interface ParseMediaIdOptions {
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

/**
 * Best-effort parser for inputs used across apps.
 * - Recognizes tmdb:/trakt:/imdb: prefixes
 * - Extracts episode suffix (:<season>:<episode>)
 * - Produces canonical ID preference order: imdb -> tmdb -> trakt -> simkl -> fallback baseId
 */
export function parseMediaIdInput(input: string | number, options: ParseMediaIdOptions = {}): ParsedMediaIdInput {
  const assumeNumeric: NumericIdAssumption = options.assumeNumeric ?? 'none';

  if (typeof input === 'number') {
    const ids = parseExternalId(input, { assumeNumeric });
    const baseId = String(input);
    return {
      raw: input,
      baseId,
      ids,
      canonicalId: buildCanonicalId(ids, ids.tmdb ? `tmdb:${ids.tmdb}` : undefined) ?? baseId,
    };
  }

  const trimmed = input.trim();
  const parsedSuffix = parseEpisodeIdSuffix(trimmed);
  const baseId = parsedSuffix.baseId.trim();

  const strictIds = parseExternalId(baseId, { assumeNumeric });
  const looseImdb = options.looseImdb && !strictIds.imdb ? normalizeImdbIdLoose(baseId) : undefined;

  const ids: ExternalIds = mergeExternalIds(strictIds, looseImdb ? { imdb: looseImdb } : {});

  const looseProviderRef = parseProviderRefLoose(baseId);

  const canonicalBaseId = buildCanonicalId(ids, baseId);
  const canonicalId = (() => {
    if (!canonicalBaseId) return null;
    if (typeof parsedSuffix.season === 'number' && typeof parsedSuffix.episode === 'number') {
      return `${canonicalBaseId}:${parsedSuffix.season}:${parsedSuffix.episode}`;
    }
    return canonicalBaseId;
  })();

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

  if (looseProviderRef?.provider) {
    result.provider = looseProviderRef.provider;
  }
  if (looseProviderRef?.kind) {
    result.kind = looseProviderRef.kind;
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

export function normalizeIdForKeyWithOptions(id: string | number, options: ParseMediaIdOptions): string {
  const parsed = parseMediaIdInput(id, options);
  return parsed.canonicalId || parsed.baseId;
}
