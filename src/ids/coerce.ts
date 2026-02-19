import type { MediaType } from '../domain/media';
import { type NumericIdAssumption } from './externalIds';
import { parseEpisodeIdSuffix, parseMediaIdInput } from './mediaId';
import {
  mediaTypeToProviderKind,
  parseProviderRefLoose,
  parseProviderRefStrict,
  type ProviderKind,
  type ProviderRef,
} from './providerRef';

export interface CoerceProviderRefOptions {
  /**
   * Controls how bare numeric inputs are interpreted.
   * Default is strict ('none') for cross-app safety.
   */
  assumeNumeric?: NumericIdAssumption;
}

function pickFirstProviderRef(ids: ReturnType<typeof parseMediaIdInput>['ids'], kind: ProviderKind): ProviderRef | null {
  if (ids.imdb) return { provider: 'imdb', kind, id: ids.imdb };
  if (ids.tmdb) return { provider: 'tmdb', kind, id: ids.tmdb };
  if (ids.trakt) return { provider: 'trakt', kind, id: ids.trakt };
  if (ids.simkl) return { provider: 'simkl', kind, id: ids.simkl };
  return null;
}

/**
 * Coerces legacy and mixed inputs into a strict `ProviderRef`.
 *
 * Accepts:
 * - strict: `provider:kind:id` (optionally with `:<season>:<episode>` suffix)
 * - loose:  `provider:id` / `imdb:tt...` / `tt...`
 * - numeric inputs when `assumeNumeric` is set
 */
export function coerceProviderRef(input: string | number, kind: ProviderKind, options: CoerceProviderRefOptions = {}): ProviderRef | null {
  const assumeNumeric: NumericIdAssumption = options.assumeNumeric ?? 'none';

  if (typeof input === 'string') {
    const suffix = parseEpisodeIdSuffix(input);
    const strict = parseProviderRefStrict(suffix.baseId);
    if (strict) {
      if (typeof suffix.season === 'number' && typeof suffix.episode === 'number') {
        return { ...strict, season: suffix.season, episode: suffix.episode };
      }
      return strict;
    }

    const loose = parseProviderRefLoose(suffix.baseId);
    if (loose) {
      if (loose.provider === 'imdb') {
        const ref: ProviderRef = { provider: 'imdb', kind: loose.kind ?? kind, id: String(loose.id) };
        if (typeof suffix.season === 'number' && typeof suffix.episode === 'number') {
          ref.season = suffix.season;
          ref.episode = suffix.episode;
        }
        return ref;
      }

      const numeric = typeof loose.id === 'number' ? loose.id : Number.parseInt(String(loose.id), 10);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }

      const ref: ProviderRef = { provider: loose.provider, kind: loose.kind ?? kind, id: Math.trunc(numeric) };
      if (typeof suffix.season === 'number' && typeof suffix.episode === 'number') {
        ref.season = suffix.season;
        ref.episode = suffix.episode;
      }
      return ref;
    }
  }

  const parsed = parseMediaIdInput(input, { assumeNumeric });
  const first = pickFirstProviderRef(parsed.ids, kind);
  if (!first) return null;

  if (typeof parsed.season === 'number' && typeof parsed.episode === 'number') {
    return { ...first, season: parsed.season, episode: parsed.episode };
  }

  return first;
}

export function coerceProviderRefFromMediaType(
  input: string | number,
  mediaType: MediaType,
  options: CoerceProviderRefOptions = {},
): ProviderRef | null {
  return coerceProviderRef(input, mediaTypeToProviderKind(mediaType), options);
}
