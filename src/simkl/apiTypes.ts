import type { SimklIdsRaw, SimklItemType, SimklPlaybackType, SimklWatchStatus } from './types';

export type SimklConfig = {
  clientId: string;
  clientSecret?: string;
  accessToken?: string;
};

export type SimklTokenResponse = {
  access_token: string;
  token_type: string;
  scope?: string;
};

export type SimklOAuthErrorResponse = {
  error: string;
};

/** PIN flow responses use a shared envelope. */
export type SimklPinCodeResponse = {
  result: 'OK' | 'KO';
  device_code?: string | number;
  user_code?: string | number;
  verification_url?: string;
  expires_in?: number;
  interval?: number;
  access_token?: string;
  message?: string;
};

export interface SimklPlaybackEpisode {
  season: number;
  episode: number;
  title?: string;
  tvdb_season?: number;
  tvdb_number?: number;
}

export interface SimklPlaybackMovie {
  title: string;
  year?: number;
  poster?: string;
  fanart?: string;
  ids: SimklIdsRaw;
}

export interface SimklPlaybackShow {
  title: string;
  year?: number;
  poster?: string;
  fanart?: string;
  ids: SimklIdsRaw;
}

export interface SimklSyncPlaybackItem {
  id: number;
  progress: number;
  paused_at: string;
  type: SimklPlaybackType;
  movie?: SimklPlaybackMovie;
  show?: SimklPlaybackShow;
  episode?: SimklPlaybackEpisode;
}

export interface SimklSearchIdItem {
  type: SimklItemType;
  title: string;
  year?: number;
  status?: string;
  poster?: string;
  ids: SimklIdsRaw;
  total_episodes?: number;
}

export interface SimklHistoryMemo {
  text: string;
  is_private?: boolean;
}

export interface SimklHistoryMovieItem {
  ids: SimklIdsRaw;
  title?: string;
  year?: number | string;
  added_at?: string;
  watched_at?: string;
  rating?: number;
  memo?: SimklHistoryMemo;
}

export interface SimklHistoryEpisodeItem {
  ids: SimklIdsRaw;
  watched_at?: string;
}

export interface SimklHistorySeasonEpisodeRef {
  number: number;
}

export interface SimklHistorySeasonItem {
  number: number;
  watched_at?: string;
  episodes?: SimklHistorySeasonEpisodeRef[];
}

export interface SimklHistoryShowItem {
  ids: SimklIdsRaw;
  title?: string;
  year?: number;
  status?: SimklWatchStatus;
  use_tvdb_anime_seasons?: boolean;
  seasons?: SimklHistorySeasonItem[];
}

export interface SimklSyncHistoryPayload {
  movies?: SimklHistoryMovieItem[];
  shows?: SimklHistoryShowItem[];
  episodes?: SimklHistoryEpisodeItem[];
}

export type SimklSyncHistoryRemovePayload = SimklSyncHistoryPayload;

export interface SimklSyncHistoryStatusResponse {
  request: unknown;
  response: {
    status?: SimklWatchStatus | string;
    simkl_type?: SimklItemType | string;
    anime_type?: string;
  };
}

export interface SimklSyncHistoryResponse {
  added: {
    movies: number;
    shows: number;
    episodes: number;
    statuses?: SimklSyncHistoryStatusResponse[];
  };
  not_found: {
    movies: unknown[];
    shows: unknown[];
    episodes: unknown[];
  };
}

export interface SimklActivitiesCategory {
  all?: string | null;
  rated_at?: string | null;
  playback?: string | null;
  plantowatch?: string | null;
  watching?: string | null;
  completed?: string | null;
  hold?: string | null;
  dropped?: string | null;
  removed_from_list?: string | null;
}

export interface SimklActivitiesResponse {
  all?: string | null;
  settings?: { all?: string | null };
  tv_shows?: SimklActivitiesCategory;
  anime?: SimklActivitiesCategory;
  movies?: SimklActivitiesCategory;
  [key: string]: unknown;
}

export interface SimklAllItemsMediaObject {
  title: string;
  year?: number;
  runtime?: number | string | null;
  status?: string;
  poster?: string;
  fanart?: string;
  ids: SimklIdsRaw;
}

export interface SimklAllItemsShowEntry {
  added_to_watchlist_at?: string;
  last_watched_at?: string | null;
  user_rated_at?: string | null;
  status?: SimklWatchStatus | string;
  user_rating?: number | null;
  last_watched?: string | null;
  next_to_watch?: string | null;
  watched_episodes_count?: number;
  total_episodes_count?: number;
  not_aired_episodes_count?: number;
  anime_type?: string;
  show: SimklAllItemsMediaObject;
}

export interface SimklAllItemsMovieEntry {
  added_to_watchlist_at?: string;
  last_watched_at?: string | null;
  user_rated_at?: string | null;
  status?: SimklWatchStatus | string;
  user_rating?: number | null;
  movie: SimklAllItemsMediaObject;
}

export interface SimklAllItemsResponse {
  shows?: SimklAllItemsShowEntry[];
  anime?: SimklAllItemsShowEntry[];
  movies?: SimklAllItemsMovieEntry[];
}
