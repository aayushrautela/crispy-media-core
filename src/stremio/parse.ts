import type { MediaType } from '../domain/media';

import { normalizeMediaType, type NumericIdAssumption } from '../ids/externalIds';

import { parseEpisodeIdSuffix, normalizeStremioId, type NormalizeStremioIdOptions } from './id';
import type {
  StremioCatalogResponse,
  StremioMeta,
  StremioMetaPreview,
  StremioMetaResponse,
  StremioStream,
  StremioStreamResponse,
  StremioSubtitle,
  StremioSubtitlesResponse,
  StremioVideo,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function normalizeType(typeValue: unknown, defaultType?: MediaType): MediaType | null {
  const t = asString(typeValue);
  if (t) return normalizeMediaType(t);
  return defaultType ?? null;
}

export interface ParseStremioOptions {
  assumeNumeric?: NumericIdAssumption;
  looseImdb?: boolean;
  defaultType?: MediaType;
}

function normalizeId(idValue: unknown, opts: NormalizeStremioIdOptions): string | null {
  if (typeof idValue === 'string') return normalizeStremioId(idValue, opts);
  if (typeof idValue === 'number') return normalizeStremioId(idValue, opts);
  return null;
}

export function dedupeStremioMetas<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export function parseStremioMetaPreview(value: unknown, options: ParseStremioOptions = {}): StremioMetaPreview | null {
  if (!isRecord(value)) return null;

  const normalizeOpts: NormalizeStremioIdOptions = {
    assumeNumeric: options.assumeNumeric ?? 'none',
    looseImdb: options.looseImdb ?? false,
  };

  const id = normalizeId(value.id, normalizeOpts) ?? (typeof value.id === 'string' || typeof value.id === 'number' ? String(value.id).trim() : '');
  if (!id) return null;

  const type = normalizeType(value.type, options.defaultType);
  if (!type) return null;

  const name = (asString(value.name) ?? asString(value.title) ?? '').trim();
  if (!name) return null;

  const poster = asString(value.poster);
  const posterShape = asString(value.posterShape);
  const background = asString(value.background);
  const logo = asString(value.logo);
  const description = asString(value.description);
  const releaseInfo = asString(value.releaseInfo);
  const genres = asStringArray(value.genres);
  const runtime = typeof value.runtime === 'string' || typeof value.runtime === 'number' ? value.runtime : undefined;
  const imdbRating = typeof value.imdbRating === 'string' || typeof value.imdbRating === 'number' ? value.imdbRating : undefined;
  const imdb_id = asString(value.imdb_id);

  const behaviorHints = isRecord(value.behaviorHints) ? value.behaviorHints : undefined;

  const out: StremioMetaPreview = {
    id,
    type,
    name,
  };

  if (poster) out.poster = poster;
  if (posterShape) out.posterShape = posterShape;
  if (background) out.background = background;
  if (logo) out.logo = logo;
  if (description) out.description = description;
  if (releaseInfo) out.releaseInfo = releaseInfo;
  if (genres) out.genres = genres;
  if (runtime != null) out.runtime = runtime;
  if (imdbRating != null) out.imdbRating = imdbRating;
  if (imdb_id) out.imdb_id = imdb_id;
  if (behaviorHints) out.behaviorHints = behaviorHints;

  return out;
}

export function parseStremioVideo(value: unknown, options: ParseStremioOptions = {}): StremioVideo | null {
  if (!isRecord(value)) return null;

  const normalizeOpts: NormalizeStremioIdOptions = {
    assumeNumeric: options.assumeNumeric ?? 'none',
    looseImdb: options.looseImdb ?? false,
  };

  const id = normalizeId(value.id, normalizeOpts) ?? (typeof value.id === 'string' || typeof value.id === 'number' ? String(value.id).trim() : '');
  if (!id) return null;

  const title = asString(value.title) ?? asString(value.name);
  const released = asString(value.released);
  const overview = asString(value.overview);
  const thumbnail = asString(value.thumbnail);
  const runtime = typeof value.runtime === 'string' || typeof value.runtime === 'number' ? value.runtime : undefined;
  const imdbRating = typeof value.imdbRating === 'string' || typeof value.imdbRating === 'number' ? value.imdbRating : undefined;
  const behaviorHints = isRecord(value.behaviorHints) ? value.behaviorHints : undefined;

  const suffix = parseEpisodeIdSuffix(id);
  const season = asNumber(value.season) ?? suffix.season;
  const episode = asNumber(value.episode) ?? suffix.episode;

  const out: StremioVideo = { id };
  if (title) out.title = title;
  if (typeof season === 'number') out.season = season;
  if (typeof episode === 'number') out.episode = episode;
  if (released) out.released = released;
  if (overview) out.overview = overview;
  if (thumbnail) out.thumbnail = thumbnail;
  if (runtime != null) out.runtime = runtime;
  if (imdbRating != null) out.imdbRating = imdbRating;
  if (behaviorHints) out.behaviorHints = behaviorHints;

  return out;
}

export function parseStremioMeta(value: unknown, options: ParseStremioOptions = {}): StremioMeta | null {
  const preview = parseStremioMetaPreview(value, options);
  if (!preview) return null;
  if (!isRecord(value)) return null;

  const cast = asStringArray(value.cast);
  const director = asStringArray(value.director);

  const videosRaw = value.videos;
  const videos = Array.isArray(videosRaw) ? videosRaw.map((v) => parseStremioVideo(v, options)).filter((v): v is StremioVideo => Boolean(v)) : undefined;

  const linksRaw = value.links;
  const links = Array.isArray(linksRaw)
    ? linksRaw
        .map((l) => {
          if (!isRecord(l)) return null;
          const name = asString(l.name);
          const url = asString(l.url);
          if (!name || !url) return null;
          const category = asString(l.category);
          return category ? { name, url, category } : { name, url };
        })
        .filter((l): l is { name: string; url: string; category?: string } => Boolean(l))
    : undefined;

  const out: StremioMeta = { ...preview };
  if (cast) out.cast = cast;
  if (director) out.director = director;
  if (videos?.length) out.videos = videos;
  if (links?.length) out.links = links;

  return out;
}

export function parseStremioMetaResponse(value: unknown, options: ParseStremioOptions = {}): StremioMetaResponse | null {
  if (!isRecord(value)) return null;
  const meta = parseStremioMeta(value.meta, options);
  if (!meta) return null;
  return { meta };
}

export function parseStremioCatalogResponse(value: unknown, options: ParseStremioOptions = {}): StremioCatalogResponse | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.metas)) return null;
  const metas = value.metas.map((m) => parseStremioMetaPreview(m, options)).filter((m): m is StremioMetaPreview => Boolean(m));
  return { metas: dedupeStremioMetas(metas) };
}

export function parseStremioStreamResponse(value: unknown): StremioStreamResponse | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.streams)) return null;

  const streams: StremioStream[] = [];
  for (const s of value.streams) {
    if (!isRecord(s)) continue;
    const name = asString(s.name)?.trim();
    if (!name) continue;

    const title = asString(s.title);
    const url = asString(s.url);
    const infoHash = asString(s.infoHash);
    const behaviorHints = isRecord(s.behaviorHints) ? s.behaviorHints : undefined;

    const stream: StremioStream = { name };
    if (title) stream.title = title;
    if (url) stream.url = url;
    if (infoHash) stream.infoHash = infoHash;
    if (behaviorHints) stream.behaviorHints = behaviorHints;

    streams.push(stream);
  }

  return { streams };
}

export function parseStremioSubtitlesResponse(value: unknown): StremioSubtitlesResponse | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.subtitles)) return null;

  const subtitles: StremioSubtitle[] = [];
  for (const s of value.subtitles) {
    if (!isRecord(s)) continue;
    const url = asString(s.url)?.trim();
    const lang = asString(s.lang)?.trim();
    if (!url || !lang) continue;
    const id = asString(s.id);
    subtitles.push(id ? { id, url, lang } : { url, lang });
  }

  return { subtitles };
}
