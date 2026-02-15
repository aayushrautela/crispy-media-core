import { buildCanonicalId, mergeExternalIds, parseExternalId, type NumericIdAssumption } from './externalIds';
import type { ExternalIds } from '../domain/media';
import { formatProviderRef, parseProviderRefLoose, type ProviderKind, type ProviderName } from './providerRef';

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
  provider?: ProviderName;
  kind?: ProviderKind;
}

export interface ParseMediaIdOptions {
  /**
   * Controls how bare numeric inputs are interpreted.
   * Default is strict ('none') for cross-app safety.
   */
  assumeNumeric?: NumericIdAssumption;
}

/**
 * Best-effort parser for inputs used across apps.
 * - Recognizes tmdb:/trakt:/imdb: prefixes
 * - Extracts episode suffix (:<season>:<episode>)
 * - Produces canonical ID preference order: imdb -> tmdb -> trakt -> tvdb -> simkl -> fallback baseId
 */
export function parseMediaIdInput(input: string | number, options: ParseMediaIdOptions = {}): ParsedMediaIdInput {
  const assumeNumeric: NumericIdAssumption = options.assumeNumeric ?? 'none';

  if (typeof input === 'number') {
    const ids = parseExternalId(input, { assumeNumeric });
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

  const strictIds = parseExternalId(baseId, { assumeNumeric });
  const looseImdb = strictIds.imdb ? undefined : normalizeImdbIdLoose(baseId);

  const ids = mergeExternalIds(strictIds, looseImdb ? { imdb: looseImdb } : {});

  const looseProviderRef = parseProviderRefLoose(baseId);
  const canonicalBaseProviderId = (() => {
    if (!looseProviderRef) return null;
    if (!looseProviderRef.kind) return null;
    // Only treat fully typed ids as canonical keys.
    if (looseProviderRef.provider === 'imdb') {
      return formatProviderRef({ provider: 'imdb', kind: looseProviderRef.kind, id: String(looseProviderRef.id) });
    }

    return formatProviderRef({ provider: looseProviderRef.provider, kind: looseProviderRef.kind, id: Number(looseProviderRef.id) });
  })();

  const canonicalId = canonicalBaseProviderId ?? buildCanonicalId(ids, baseId);

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

  // If we had a fully typed provider id, preserve episode suffix in canonical form.
  if (canonicalBaseProviderId && typeof result.season === 'number' && typeof result.episode === 'number') {
    result.canonicalId = `${canonicalBaseProviderId}:${result.season}:${result.episode}`;
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

/**
 * Legacy behavior: treats bare numeric inputs as TMDB ids.
 */
export function normalizeIdForKeyLegacy(id: string | number): string {
  return normalizeIdForKeyWithOptions(id, { assumeNumeric: 'tmdb' });
}

/**
 * Legacy behavior: treats bare numeric inputs as TMDB ids.
 * Prefer `parseMediaIdInput(input)` (strict) in new code.
 */
export function parseMediaIdInputLegacy(input: string | number): ParsedMediaIdInput {
  return parseMediaIdInput(input, { assumeNumeric: 'tmdb' });
}
