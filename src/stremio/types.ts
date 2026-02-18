import type { MediaType } from '../domain/media';

export type StremioMediaType = MediaType;

export type StremioResourceName =
  | 'catalog'
  | 'meta'
  | 'stream'
  | 'subtitles'
  | 'addon_catalog'
  | (string & {});

export interface StremioResourceDescriptor {
  name: StremioResourceName;
  types?: StremioMediaType[];
  idPrefixes?: string[];
}

export interface StremioAddonCatalogDescriptor {
  type: string;
  id: string;
  name: string;
}

export interface StremioExtraParam {
  name: string;
  isRequired?: boolean;
  options?: string[];
  optionsLimit?: number;
}

export interface StremioCatalogDescriptor {
  type: StremioMediaType;
  id: string;
  name?: string;
  genres?: string[];
  extra?: Array<string | StremioExtraParam>;
  extraSupported?: string[];
  extraRequired?: string[];
}

export interface StremioManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  resources: Array<StremioResourceName | StremioResourceDescriptor>;
  types?: StremioMediaType[];
  idPrefixes?: string[];
  catalogs?: StremioCatalogDescriptor[];
  addonCatalogs?: StremioAddonCatalogDescriptor[];
  behaviorHints?: Record<string, unknown> & {
    newEpisodeNotifications?: boolean;
  };
}

export type StremioPosterShape = 'poster' | 'square' | 'landscape' | (string & {});

export interface StremioMetaPreview {
  id: string;
  type: StremioMediaType;
  name: string;
  poster?: string;
  posterShape?: StremioPosterShape;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  genres?: string[];
  runtime?: string | number;
  imdbRating?: string | number;
  imdb_id?: string;
  behaviorHints?: Record<string, unknown>;
}

export interface StremioVideo {
  id: string;
  title?: string;
  season?: number;
  episode?: number;
  released?: string;
  overview?: string;
  thumbnail?: string;
  runtime?: string | number;
  imdbRating?: string | number;
  behaviorHints?: Record<string, unknown>;
}

export interface StremioMeta extends StremioMetaPreview {
  cast?: string[];
  director?: string[];
  videos?: StremioVideo[];
  links?: Array<{ name: string; category?: string; url: string }>;
}

export interface StremioMetaResponse {
  meta: StremioMeta;
}

export interface StremioCatalogResponse {
  metas: StremioMetaPreview[];
}

export interface StremioStream {
  name: string;
  title?: string;
  url?: string;
  infoHash?: string;
  behaviorHints?: Record<string, unknown>;
}

export interface StremioStreamResponse {
  streams: StremioStream[];
}

export interface StremioSubtitle {
  id?: string;
  url: string;
  lang: string;
}

export interface StremioSubtitlesResponse {
  subtitles: StremioSubtitle[];
}
