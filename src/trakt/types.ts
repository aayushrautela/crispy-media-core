import { type ExternalIds } from '../domain/media';

export interface TraktIds extends ExternalIds {
  trakt?: number;
  slug?: string;
  imdb?: string;
  tmdb?: number;
  tvdb?: number;
}

export interface TraktImageVariant {
  full?: string;
  medium?: string;
  thumb?: string;
  url?: string;
}

export type TraktImageEntry = string | TraktImageVariant;
export type TraktImageField = TraktImageEntry | TraktImageEntry[];

export interface TraktImages {
  poster?: TraktImageField;
  fanart?: TraktImageField;
  logo?: TraktImageField;
  thumb?: TraktImageField;
  banner?: TraktImageField;
  clearart?: TraktImageField;
  [key: string]: TraktImageField | undefined;
}

export interface TraktMediaItem {
  title: string;
  year?: number;
  ids: TraktIds;
  images?: TraktImages;
}

export interface TraktMovie {
  title: string;
  year?: number;
  overview?: string;
  runtime?: number;
  rating?: number;
  released?: string;
  status?: string;
  ids?: TraktIds;
  images?: TraktImages;
}

export interface TraktShow {
  title: string;
  year?: number;
  overview?: string;
  runtime?: number;
  rating?: number;
  first_aired?: string;
  status?: string;
  ids?: TraktIds;
  images?: TraktImages;
}

export interface TraktEpisode {
  title?: string;
  season?: number;
  number?: number;
  number_abs?: number;
  overview?: string;
  runtime?: number;
  first_aired?: string;
  ids?: TraktIds;
  images?: TraktImages;
}

export interface TraktPlaybackItem {
  progress?: number;
  paused_at?: string;
  movie?: TraktMovie;
  show?: TraktShow;
  episode?: TraktEpisode;
}

export type TraktWrappedItem =
  | TraktPlaybackItem
  | {
      type?: 'movie' | 'show' | 'episode';
      movie?: TraktMovie;
      show?: TraktShow;
      episode?: TraktEpisode;
      title?: string;
      year?: number;
      overview?: string;
      runtime?: number;
      rating?: number;
      released?: string;
      first_aired?: string;
      ids?: TraktIds;
      images?: TraktImages;
      status?: string;
      progress?: number;
      paused_at?: string;
    };
