import type { TraktEpisode, TraktIds, TraktMediaItem, TraktMovie, TraktShow } from './types';

export type TraktConfig = {
  clientId: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
};

export type TraktDeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_url: string;
  expires_in: number;
  interval: number;
};

export type TraktTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  created_at: number;
};

export interface TraktUser {
  username: string;
  name?: string;
  private: boolean;
  vip: boolean;
  joined_at: string;
  avatar?: string;
}

export interface TraktSyncPlaybackItem {
  progress: number;
  paused_at: string;
  id: number;
  type: 'movie' | 'episode';
  movie?: TraktMovie;
  episode?: TraktEpisode;
  show?: TraktShow;
}

export interface TraktWatchedMovie {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  movie: TraktMediaItem;
}

export interface TraktWatchedShow {
  plays: number;
  last_watched_at: string;
  last_updated_at: string;
  reset_at: string | null;
  show: TraktMediaItem;
  seasons: {
    number: number;
    episodes: {
      number: number;
      plays: number;
      last_watched_at: string;
    }[];
  }[];
}

export interface TraktWatchlistItem {
  rank: number;
  id: number;
  listed_at: string;
  notes: string | null;
  type: 'movie' | 'show';
  movie?: TraktMediaItem;
  show?: TraktMediaItem;
}

export interface TraktCollectionItem {
  collected_at: string;
  updated_at: string;
  type: 'movie' | 'show';
  movie?: TraktMediaItem;
  show?: TraktMediaItem;
  last_collected_at?: string;
}

export interface TraktRatingItem {
  rated_at: string;
  rating: number;
  type: 'movie' | 'show' | 'episode';
  movie?: TraktMediaItem;
  show?: TraktMediaItem;
  episode?: {
    season: number;
    number: number;
    title: string;
    ids: {
      trakt?: number;
      tvdb?: number | null;
      imdb?: string | null;
      tmdb?: number | null;
    };
  };
}

export interface TraktUserStats {
  rating?: number;
  play_count?: number;
  completed_count?: number;
}

export interface TraktContentComment {
  id: number;
  comment: string;
  spoiler: boolean;
  review: boolean;
  parent_id: number;
  created_at: string;
  updated_at: string;
  replies: number;
  likes: number;
  language: string;
  user_rating?: number;
  user_stats?: TraktUserStats;
  user: {
    username: string;
    private: boolean;
    deleted?: boolean;
    name?: string;
    vip: boolean;
    vip_ep: boolean;
    director?: boolean;
    ids: {
      slug: string;
    };
  };
}

export interface TraktSyncPayload {
  movies?: Array<{
    ids: TraktIds;
    title?: string;
    year?: number;
  }>;
  shows?: Array<{
    ids: TraktIds;
    title?: string;
    year?: number;
  }>;
  episodes?: Array<{
    ids: TraktIds;
  }>;
}

export interface TraktSyncResponse {
  added: {
    movies: number;
    episodes: number;
    shows: number;
  };
  existing: {
    movies: number;
    episodes: number;
    shows: number;
  };
  deleted: {
    movies: number;
    episodes: number;
    shows: number;
  };
  not_found: {
    movies: Array<{ ids: TraktIds }>;
    shows: Array<{ ids: TraktIds }>;
    episodes: Array<{ ids: TraktIds }>;
    seasons: Array<{ ids: TraktIds }>;
    people: Array<{ ids: TraktIds }>;
  };
}

export interface TraktRatingPayload {
  movies?: Array<{
    ids: TraktIds;
    rating: number;
    rated_at?: string;
  }>;
  shows?: Array<{
    ids: TraktIds;
    rating: number;
    rated_at?: string;
  }>;
  episodes?: Array<{
    ids: TraktIds;
    rating: number;
    rated_at?: string;
  }>;
}

export interface TraktRecommendation {
  rank: number;
  id: number;
  type: 'movie' | 'show';
  movie?: TraktMediaItem;
  show?: TraktMediaItem;
}
