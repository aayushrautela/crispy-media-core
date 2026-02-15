import type { MediaType } from '../domain/media';
import { normalizeImdbId } from './externalIds';

export type ProviderName = 'tmdb' | 'trakt' | 'tvdb' | 'simkl' | 'imdb';

/**
 * Provider-level kinds used for disambiguating ids across apps.
 * `show` is preferred over `series`/`tv`.
 */
export type ProviderKind = 'movie' | 'show' | 'episode';

export type ProviderRef =
  | {
      provider: 'imdb';
      kind: ProviderKind;
      id: string; // tt...
      season?: number;
      episode?: number;
    }
  | {
      provider: Exclude<ProviderName, 'imdb'>;
      kind: ProviderKind;
      id: number;
      season?: number;
      episode?: number;
    };

export interface ProviderRefLoose {
  provider: ProviderName;
  kind?: ProviderKind;
  id: number | string;
}

const PROVIDERS: ReadonlySet<string> = new Set(['tmdb', 'trakt', 'tvdb', 'simkl', 'imdb']);
const KINDS: ReadonlySet<string> = new Set(['movie', 'show', 'episode', 'tv', 'series']);

function normalizeKind(value: string | undefined): ProviderKind | undefined {
  if (!value) return undefined;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'movie') return 'movie';
  if (lowered === 'show' || lowered === 'tv' || lowered === 'series') return 'show';
  if (lowered === 'episode') return 'episode';
  return undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function mediaTypeToProviderKind(type: MediaType): Exclude<ProviderKind, 'episode'> {
  return type === 'movie' ? 'movie' : 'show';
}

export function formatProviderRef(ref: ProviderRef): string {
  return `${ref.provider}:${ref.kind}:${ref.id}`;
}

/**
 * Strict parser: expects `provider:kind:id`.
 */
export function parseProviderRefStrict(input: string): ProviderRef | null {
  const raw = input.trim();
  if (!raw) return null;

  const parts = raw.split(':').map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 3) return null;

  const provider = parts[0]?.toLowerCase() ?? '';
  const kind = normalizeKind(parts[1]);
  const idPart = parts[2] ?? '';

  if (!PROVIDERS.has(provider) || !kind) {
    return null;
  }

  if (provider === 'imdb') {
    const imdb = normalizeImdbId(idPart) ?? (idPart.toLowerCase().startsWith('tt') ? normalizeImdbId(idPart) : undefined);
    if (!imdb) return null;
    return { provider: 'imdb', kind, id: imdb };
  }

  const numeric = parsePositiveInt(idPart);
  if (!numeric) return null;

  if (provider === 'tmdb' || provider === 'trakt' || provider === 'tvdb' || provider === 'simkl') {
    return { provider, kind, id: numeric };
  }

  return null;
}

/**
 * Loose parser used for backward compatibility.
 * Accepts `provider:id` (no kind) and `imdb:tt...`.
 */
export function parseProviderRefLoose(input: string): ProviderRefLoose | null {
  const raw = input.trim();
  if (!raw) return null;

  const parts = raw.split(':').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const provider = parts[0]?.toLowerCase() ?? '';
  if (!PROVIDERS.has(provider)) return null;

  const maybeKind = normalizeKind(parts[1]);

  // `provider:kind:id`
  if (maybeKind && parts.length >= 3) {
    if (provider === 'imdb') {
      const imdb = normalizeImdbId(parts[2] ?? '');
      if (!imdb) return null;
      return { provider: 'imdb', kind: maybeKind, id: imdb };
    }

    const numeric = parsePositiveInt(parts[2]);
    if (!numeric) return null;
    return { provider: provider as ProviderName, kind: maybeKind, id: numeric };
  }

  // `provider:id`
  if (provider === 'imdb') {
    const imdb = normalizeImdbId(parts[1] ?? '');
    if (!imdb) return null;
    return { provider: 'imdb', id: imdb };
  }

  const numeric = parsePositiveInt(parts[1]);
  if (!numeric) return null;
  return { provider: provider as ProviderName, id: numeric };
}
