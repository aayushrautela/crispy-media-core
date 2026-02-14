export interface TMDBImageAsset {
  file_path: string;
  iso_639_1?: string | null;
  file_type?: string | null;
  vote_average?: number;
}

export interface TMDBImagesResponse {
  backdrops?: TMDBImageAsset[];
  posters?: TMDBImageAsset[];
  logos?: TMDBImageAsset[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBKeyword {
  id: number;
  name: string;
}

export interface TMDBVideo {
  key: string;
  site: string;
  type: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job?: string;
}

export interface TMDBSpokenLanguage {
  iso_639_1: string;
  english_name?: string;
  name?: string;
}

export interface TMDBProductionCompany {
  id: number;
  name: string;
  logo_path?: string | null;
}

export interface TMDBSeasonSummary {
  season_number: number;
}

export interface TMDBExternalIds {
  imdb_id?: string | null;
}

export interface TMDBReleaseDateEntry {
  certification?: string;
}

export interface TMDBReleaseDateResult {
  iso_3166_1: string;
  release_dates: TMDBReleaseDateEntry[];
}

export interface TMDBReleaseDatesResponse {
  results: TMDBReleaseDateResult[];
}

export interface TMDBContentRatingEntry {
  iso_3166_1: string;
  rating?: string;
}

export interface TMDBContentRatingsResponse {
  results: TMDBContentRatingEntry[];
}

export interface TMDBCredits {
  cast?: TMDBCastMember[];
  crew?: TMDBCrewMember[];
}

export interface TMDBVideosResponse {
  results?: TMDBVideo[];
}

export interface TMDBKeywordsResponse {
  keywords?: TMDBKeyword[];
  results?: TMDBKeyword[];
}

export interface TMDBDetailBase {
  id: number;
  overview?: string;
  vote_average?: number;
  status?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: TMDBGenre[];
  spoken_languages?: TMDBSpokenLanguage[];
  production_companies?: TMDBProductionCompany[];
  credits?: TMDBCredits;
  videos?: TMDBVideosResponse;
  keywords?: TMDBKeywordsResponse;
  external_ids?: TMDBExternalIds;
}

export interface TMDBMovieDetail extends TMDBDetailBase {
  title: string;
  original_title?: string;
  release_date?: string;
  runtime?: number;
  imdb_id?: string | null;
  release_dates?: TMDBReleaseDatesResponse;
}

export interface TMDBShowDetail extends TMDBDetailBase {
  name: string;
  original_name?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TMDBSeasonSummary[];
  content_ratings?: TMDBContentRatingsResponse;
}

export type TMDBDetail = TMDBMovieDetail | TMDBShowDetail;
