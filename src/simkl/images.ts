const HTTP_PATTERN = /^https?:\/\//i;
const HOST_WITH_PATH_PATTERN = /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i;

export const SIMKL_IMAGE_ORIGIN = 'https://simkl.in';
export const SIMKL_IMAGE_PROXY_ORIGIN = 'https://wsrv.nl/?url=https://simkl.in';

export type SimklImageCategory = 'posters' | 'fanart' | 'episodes' | 'avatars';
export type SimklPosterVariant = 'w' | 'm' | 'ca' | 'c' | 'cm' | 's';
export type SimklFanartVariant = 'd' | 'medium' | 'mobile' | 'w' | 's48';
export type SimklEpisodeVariant = 'w' | 'c' | 'm';
export type SimklImageFormat = 'webp' | 'jpg';

export interface SimklImageUrlOptions {
  /** Use Simkl-recommended proxy base (`wsrv.nl`). Defaults to `false`. */
  useProxy?: boolean;
  originBaseUrl?: string;
  proxyBaseUrl?: string;
  format?: SimklImageFormat;
}

function ensureBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function sanitizePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Simkl paths are URL-like; normalize accidental backslashes.
  const normalized = trimmed.replace(/\\/g, '/');
  return normalized.startsWith('/') ? normalized.slice(1) : normalized;
}

function hasFileExtension(path: string): boolean {
  return /\.(?:jpg|jpeg|webp|png)$/i.test(path);
}

function isCategoryPrefixed(path: string): boolean {
  return /^(?:posters|fanart|episodes|avatars)\//i.test(path);
}

export function buildSimklImageUrl(
  category: SimklImageCategory,
  path: string,
  variant?: string,
  options: SimklImageUrlOptions = {}
): string | undefined {
  const input = path?.trim();
  if (!input) return undefined;

  if (HTTP_PATTERN.test(input)) return input;
  if (input.startsWith('//')) return `https:${input}`;
  if (HOST_WITH_PATH_PATTERN.test(input)) return `https://${input}`;

  const base = ensureBaseUrl(
    options.useProxy
      ? (options.proxyBaseUrl ?? SIMKL_IMAGE_PROXY_ORIGIN)
      : (options.originBaseUrl ?? SIMKL_IMAGE_ORIGIN)
  );

  if (input.startsWith('/')) {
    return `${base}${input}`;
  }

  const cleaned = sanitizePath(input);
  if (!cleaned) return undefined;

  // If the API already returned a full relative path (rare), preserve it.
  if (isCategoryPrefixed(cleaned)) {
    return `${base}/${cleaned}`;
  }

  // If caller passed a filename (already sized), do not append a variant.
  if (hasFileExtension(cleaned)) {
    return `${base}/${category}/${cleaned}`;
  }

  const format = options.format ?? 'webp';
  const suffix = variant ? `_${variant}` : '';
  return `${base}/${category}/${cleaned}${suffix}.${format}`;
}

export function buildSimklPosterUrl(path: string, variant: SimklPosterVariant = 'ca', options?: SimklImageUrlOptions): string | undefined {
  return buildSimklImageUrl('posters', path, variant, options);
}

export function buildSimklFanartUrl(path: string, variant: SimklFanartVariant = 'mobile', options?: SimklImageUrlOptions): string | undefined {
  return buildSimklImageUrl('fanart', path, variant, options);
}

export function buildSimklEpisodeImageUrl(path: string, variant: SimklEpisodeVariant = 'w', options?: SimklImageUrlOptions): string | undefined {
  return buildSimklImageUrl('episodes', path, variant, options);
}

export function buildSimklAvatarUrl(path: string, options?: SimklImageUrlOptions): string | undefined {
  return buildSimklImageUrl('avatars', path, undefined, options);
}

export function buildSimklPosterUrls(path: string, options?: SimklImageUrlOptions): string[] {
  const variants: SimklPosterVariant[] = ['cm', 'c', 'ca', 'm', 's'];
  const urls: string[] = [];
  for (const v of variants) {
    const url = buildSimklPosterUrl(path, v, options);
    if (url) urls.push(url);
  }
  return urls;
}

export function buildSimklFanartUrls(path: string, options?: SimklImageUrlOptions): string[] {
  const variants: SimklFanartVariant[] = ['s48', 'w', 'mobile', 'medium', 'd'];
  const urls: string[] = [];
  for (const v of variants) {
    const url = buildSimklFanartUrl(path, v, options);
    if (url) urls.push(url);
  }
  return urls;
}
