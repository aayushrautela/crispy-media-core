import type { MediaType } from '../domain/media';
import { parseEpisodeIdSuffix, parseMediaIdInput } from './mediaId';
import { formatProviderRef, mediaTypeToProviderKind, type ProviderKind, type ProviderName } from './providerRef';

function appendEpisodeSuffix(id: string, season: number | undefined, episode: number | undefined): string {
  if (typeof season === 'number' && typeof episode === 'number') {
    return `${id}:${season}:${episode}`;
  }

  return id;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function matchesAnyPrefix(value: string, idPrefixes: readonly string[]): boolean {
  for (const prefix of idPrefixes) {
    if (value.startsWith(prefix)) return true;
  }
  return false;
}

function inferNumericProvider(idPrefixes: readonly string[] | undefined): ProviderName | null {
  if (!idPrefixes || idPrefixes.length === 0) return null;

  const providers = new Set<ProviderName>();

  for (const prefix of idPrefixes) {
    const lower = prefix.toLowerCase();
    if (lower.startsWith('tmdb')) providers.add('tmdb');
    else if (lower.startsWith('trakt')) providers.add('trakt');
    else if (lower.startsWith('tvdb')) providers.add('tvdb');
    else if (lower.startsWith('simkl')) providers.add('simkl');
  }

  // Numeric IMDB ids are not a supported interchange format.
  if (providers.size === 1) {
    return Array.from(providers)[0] ?? null;
  }

  return null;
}

function formatTypedProviderId(provider: ProviderName, kind: ProviderKind, id: string | number): string {
  if (provider === 'imdb') {
    return formatProviderRef({ provider: 'imdb', kind, id: String(id) });
  }

  return formatProviderRef({ provider, kind, id: Number(id) });
}

/**
 * Formats a media id into a Stremio addon-compatible id based on `idPrefixes`.
 *
 * Common examples:
 * - `tt0137523`
 * - `tt0944947:1:2`
 * - `tmdb:1399`
 * - `tmdb:1399:1:2`
 */
export function formatIdForIdPrefixes(
  input: string | number,
  mediaType: MediaType,
  idPrefixes?: readonly string[]
): string | null {
  const raw = typeof input === 'string' ? input.trim() : String(input);
  if (!raw) return null;

  const suffix = parseEpisodeIdSuffix(raw);
  const baseId = suffix.baseId.trim();
  const season = suffix.season;
  const episode = suffix.episode;

  // Avoid `parseMediaIdInput()` turning bare numeric ids into `tt<digits>`.
  if (/^\d+$/.test(baseId) && !baseId.includes(':')) {
    const provider = inferNumericProvider(idPrefixes);
    if (!provider) return null;
    return appendEpisodeSuffix(`${provider}:${baseId}`, season, episode);
  }

  const parsed = parseMediaIdInput(raw, { assumeNumeric: 'none' });
  const ids = parsed.ids;
  const kind = mediaTypeToProviderKind(mediaType);

  const candidates: string[] = [];

  if (ids.imdb) {
    candidates.push(appendEpisodeSuffix(ids.imdb, season, episode));
    candidates.push(appendEpisodeSuffix(`imdb:${ids.imdb}`, season, episode));
    candidates.push(appendEpisodeSuffix(formatTypedProviderId('imdb', kind, ids.imdb), season, episode));
  }

  if (typeof ids.tmdb === 'number') {
    candidates.push(appendEpisodeSuffix(`tmdb:${ids.tmdb}`, season, episode));
    candidates.push(appendEpisodeSuffix(formatTypedProviderId('tmdb', kind, ids.tmdb), season, episode));
  }

  if (typeof ids.trakt === 'number') {
    candidates.push(appendEpisodeSuffix(`trakt:${ids.trakt}`, season, episode));
    candidates.push(appendEpisodeSuffix(formatTypedProviderId('trakt', kind, ids.trakt), season, episode));
  }

  if (typeof ids.tvdb === 'number') {
    candidates.push(appendEpisodeSuffix(`tvdb:${ids.tvdb}`, season, episode));
    candidates.push(appendEpisodeSuffix(formatTypedProviderId('tvdb', kind, ids.tvdb), season, episode));
  }

  if (typeof ids.simkl === 'number') {
    candidates.push(appendEpisodeSuffix(`simkl:${ids.simkl}`, season, episode));
    candidates.push(appendEpisodeSuffix(formatTypedProviderId('simkl', kind, ids.simkl), season, episode));
  }

  // Last-resort fallback: preserve the caller base id shape.
  candidates.push(appendEpisodeSuffix(baseId, season, episode));

  const unique = dedupe(candidates);

  if (idPrefixes && idPrefixes.length > 0) {
    for (const candidate of unique) {
      if (matchesAnyPrefix(candidate, idPrefixes)) {
        return candidate;
      }
    }
    return null;
  }

  return unique[0] ?? null;
}
