import { type ExternalIds, type ImageSet, type MediaDetails, type MediaType, type PersonCredit } from '../domain/media';
import { normalizeImdbId } from '../ids/externalIds';
import { buildCanonicalMediaId, mediaTypeToProviderKind } from '../ids/canonical';
import {
  type TMDBCastMember,
  type TMDBDetail,
  type TMDBImageAsset,
  type TMDBImagesResponse,
  type TMDBMovieDetail,
  type TMDBShowDetail,
} from './types';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

function toImageUrl(path: string | null | undefined, size = 'original'): string | undefined {
  if (!path) {
    return undefined;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  if (path.startsWith('//')) {
    return `https:${path}`;
  }

  if (!path.startsWith('/')) {
    return undefined;
  }

  return `${IMAGE_BASE}/${size}${path}`;
}

function isMovieDetail(detail: TMDBDetail): detail is TMDBMovieDetail {
  return 'title' in detail;
}

function isShowDetail(detail: TMDBDetail): detail is TMDBShowDetail {
  return 'name' in detail;
}

function parseYear(value: string | undefined): number | undefined {
  if (!value || value.length < 4) {
    return undefined;
  }

  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) && year > 0 ? year : undefined;
}

function selectLogo(images: TMDBImagesResponse | undefined): string | undefined {
  const logos = images?.logos ?? [];
  if (!logos.length) {
    return undefined;
  }

  const english = logos.filter((logo) => logo.iso_639_1 === 'en');
  const englishSvg = english.find((logo) => logo.file_type === '.svg' || logo.file_type === 'svg');
  if (englishSvg?.file_path) {
    return toImageUrl(englishSvg.file_path, 'original');
  }

  const englishPng = english.find((logo) => logo.file_type === '.png' || logo.file_type === 'png');
  if (englishPng?.file_path) {
    return toImageUrl(englishPng.file_path, 'original');
  }

  const firstEnglish = english[0];
  if (firstEnglish?.file_path) {
    return toImageUrl(firstEnglish.file_path, 'original');
  }

  const anySvg = logos.find((logo) => logo.file_type === '.svg' || logo.file_type === 'svg');
  if (anySvg?.file_path) {
    return toImageUrl(anySvg.file_path, 'original');
  }

  const anyPng = logos.find((logo) => logo.file_type === '.png' || logo.file_type === 'png');
  if (anyPng?.file_path) {
    return toImageUrl(anyPng.file_path, 'original');
  }

  const fallback = logos[0];
  return fallback?.file_path ? toImageUrl(fallback.file_path, 'original') : undefined;
}

function mapImageAssets(assets: TMDBImageAsset[] | undefined): string[] | undefined {
  if (!assets?.length) {
    return undefined;
  }

  const mapped = assets
    .map((asset) => toImageUrl(asset.file_path, 'original'))
    .filter((url): url is string => typeof url === 'string');

  return mapped.length ? mapped : undefined;
}

function getRuntimeMinutes(detail: TMDBDetail): number | undefined {
  if (isMovieDetail(detail)) {
    return detail.runtime && detail.runtime > 0 ? detail.runtime : undefined;
  }

  if (isShowDetail(detail)) {
    const first = detail.episode_run_time?.[0];
    return first && first > 0 ? first : undefined;
  }

  return undefined;
}

function getReleasedDate(detail: TMDBDetail): string | undefined {
  if (isMovieDetail(detail)) {
    return detail.release_date;
  }

  if (isShowDetail(detail)) {
    return detail.first_air_date;
  }

  return undefined;
}

function getCertification(detail: TMDBDetail, type: MediaType): string | undefined {
  if (type === 'movie' && isMovieDetail(detail)) {
    const releaseResults = detail.release_dates?.results ?? [];
    const fromCountry = (countryCode: string): string | undefined => {
      const country = releaseResults.find((entry) => entry.iso_3166_1 === countryCode);
      if (!country) {
        return undefined;
      }
      const found = country.release_dates.find((entry) => entry.certification && entry.certification.trim());
      return found?.certification?.trim() || undefined;
    };

    return fromCountry('US') ?? fromCountry('GB') ?? releaseResults.flatMap((entry) => entry.release_dates).find((entry) => entry.certification)?.certification;
  }

  if (type === 'series' && isShowDetail(detail)) {
    const ratings = detail.content_ratings?.results ?? [];
    const fromCountry = (countryCode: string): string | undefined => {
      const country = ratings.find((entry) => entry.iso_3166_1 === countryCode);
      return country?.rating?.trim() || undefined;
    };

    return fromCountry('US') ?? fromCountry('GB') ?? ratings.find((entry) => entry.rating)?.rating;
  }

  return undefined;
}

function getDirector(detail: TMDBDetail): string | undefined {
  const crew = detail.credits?.crew ?? [];
  const director = crew.find((member) => member.job === 'Director');
  return director?.name;
}

function getTrailerKey(detail: TMDBDetail): string | undefined {
  const videos = detail.videos?.results ?? [];
  const trailer = videos.find((video) => video.site.toLowerCase() === 'youtube' && video.type.toLowerCase() === 'trailer');
  if (trailer?.key) {
    return trailer.key;
  }

  const fallback = videos.find((video) => video.site.toLowerCase() === 'youtube');
  return fallback?.key;
}

function getTags(detail: TMDBDetail): string[] | undefined {
  const raw = detail.keywords?.keywords ?? detail.keywords?.results ?? [];
  const tags = raw.map((entry) => entry.name).filter((name): name is string => typeof name === 'string' && !!name.trim());
  return tags.length ? tags : undefined;
}

function getCast(detail: TMDBDetail): PersonCredit[] | undefined {
  const cast = detail.credits?.cast ?? [];
  const normalized = cast.slice(0, 10).map((member: TMDBCastMember) => {
    const person: PersonCredit = {
      id: member.id,
      name: member.name,
    };

    if (member.character) {
      person.role = member.character;
    }

    const profile = toImageUrl(member.profile_path, 'w185');
    if (profile) {
      person.profile = profile;
    }

    if (typeof member.order === 'number') {
      person.order = member.order;
    }

    return person;
  });

  return normalized.length ? normalized : undefined;
}

function getLanguageCodes(detail: TMDBDetail): string[] | undefined {
  const languages = detail.spoken_languages ?? [];
  const codes = languages
    .map((language) => language.iso_639_1)
    .filter((code): code is string => typeof code === 'string' && !!code.trim());

  return codes.length ? Array.from(new Set(codes)) : undefined;
}

export function normalizeTmdbDetails(detail: TMDBDetail, type: MediaType, images?: TMDBImagesResponse): MediaDetails {
  const ids: ExternalIds = {
    tmdb: detail.id,
  };

  const imdb = normalizeImdbId(isMovieDetail(detail) ? detail.imdb_id ?? undefined : detail.external_ids?.imdb_id ?? undefined);
  if (imdb) {
    ids.imdb = imdb;
  }

  const title = isMovieDetail(detail) ? detail.title : detail.name;
  const released = getReleasedDate(detail);
  const kind = mediaTypeToProviderKind(type);
  const typedFallback = `tmdb:${kind}:${detail.id}`;
  const id = buildCanonicalMediaId(ids, kind, typedFallback) ?? typedFallback;

  const normalized: MediaDetails = {
    id,
    type,
    title: title || 'Untitled',
    ids,
    images: {},
  };

  const runtimeMinutes = getRuntimeMinutes(detail);
  if (runtimeMinutes) {
    normalized.runtimeMinutes = runtimeMinutes;
  }

  if (released) {
    normalized.released = released;
  }

  const year = parseYear(released);
  if (year) {
    normalized.year = year;
  }

  if (detail.overview?.trim()) {
    normalized.description = detail.overview.trim();
  }

  if (typeof detail.vote_average === 'number') {
    normalized.rating = detail.vote_average;
  }

  if (detail.status?.trim()) {
    normalized.status = detail.status.trim();
  }

  const genres = detail.genres?.map((genre) => genre.name).filter((name): name is string => !!name?.trim());
  if (genres?.length) {
    normalized.genres = genres;
  }

  const imageSet: ImageSet = {};
  const poster = toImageUrl(detail.poster_path, 'w780');
  if (poster) {
    imageSet.poster = poster;
  }

  const backdrop = toImageUrl(detail.backdrop_path, 'w1280');
  if (backdrop) {
    imageSet.backdrop = backdrop;
  }

  const logo = selectLogo(images);
  if (logo) {
    imageSet.logo = logo;
  }

  const posters = mapImageAssets(images?.posters);
  if (posters) {
    imageSet.posters = posters;
  }

  const backdrops = mapImageAssets(images?.backdrops);
  if (backdrops) {
    imageSet.backdrops = backdrops;
  }

  normalized.images = imageSet;

  const cast = getCast(detail);
  if (cast) {
    normalized.cast = cast;
  }

  const director = getDirector(detail);
  if (director) {
    normalized.director = director;
  }

  const trailerKey = getTrailerKey(detail);
  if (trailerKey) {
    normalized.trailerKey = trailerKey;
  }

  const certification = getCertification(detail, type);
  if (certification) {
    normalized.certification = certification;
  }

  const languages = getLanguageCodes(detail);
  if (languages) {
    normalized.languages = languages;
  }

  const tags = getTags(detail);
  if (tags) {
    normalized.tags = tags;
  }

  if (type === 'series' && isShowDetail(detail)) {
    if (typeof detail.number_of_episodes === 'number') {
      normalized.episodeCount = detail.number_of_episodes;
    }

    const seasons = detail.seasons
      ?.map((season) => season.season_number)
      .filter((season): season is number => Number.isFinite(season) && season > 0);

    if (seasons?.length) {
      normalized.seasons = seasons;
    }
  }

  return normalized;
}
