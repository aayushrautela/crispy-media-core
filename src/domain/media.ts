export type MediaType = 'movie' | 'series';

export interface ExternalIds {
  trakt?: number;
  tmdb?: number;
  tvdb?: number;
  simkl?: number;
  imdb?: string;
  slug?: string;
}

export interface ImageSet {
  poster?: string;
  backdrop?: string;
  logo?: string;
  fanart?: string;
  thumbnail?: string;
  posters?: string[];
  backdrops?: string[];
}

export interface PersonCredit {
  id?: string | number;
  name: string;
  role?: string;
  profile?: string;
  order?: number;
}

export interface EpisodeInfo {
  season: number;
  episode: number;
  title?: string;
  overview?: string;
  runtimeMinutes?: number;
  releaseDate?: string;
  thumbnail?: string;
}

export interface MediaCore {
  id: string;
  type: MediaType;
  title: string;
  year?: number;
  description?: string;
  rating?: number;
  runtimeMinutes?: number;
  released?: string;
  status?: string;
  genres?: string[];
  ids: ExternalIds;
  images: ImageSet;
}

export interface MediaDetails extends MediaCore {
  cast?: PersonCredit[];
  director?: string;
  certification?: string;
  trailerKey?: string;
  languages?: string[];
  episodeCount?: number;
  seasons?: number[];
  episodes?: EpisodeInfo[];
  tags?: string[];
}
