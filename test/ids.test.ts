import { describe, expect, it } from 'vitest';

import {
  buildProviderRefFromStremioId,
  formatIdForIdPrefixes,
  normalizeImdbId,
  parseExternalId,
  parseProviderRefLoose,
  parseProviderRefStrict,
} from '../src/index';

describe('ids', () => {
  it('parses strict provider refs', () => {
    expect(parseProviderRefStrict('tmdb:movie:550')).toEqual({ provider: 'tmdb', kind: 'movie', id: 550 });
    expect(parseProviderRefStrict('imdb:show:tt0944947')).toEqual({ provider: 'imdb', kind: 'show', id: 'tt0944947' });
    expect(parseProviderRefStrict('tmdb:550')).toBeNull();
  });

  it('parses loose provider refs', () => {
    expect(parseProviderRefLoose('tmdb:550')).toEqual({ provider: 'tmdb', id: 550 });
    expect(parseProviderRefLoose('trakt:show:1')).toEqual({ provider: 'trakt', kind: 'show', id: 1 });
  });

  it('normalizes imdb ids including typed imdb prefix', () => {
    expect(normalizeImdbId('tt0137523')).toBe('tt0137523');
    expect(normalizeImdbId('imdb:tt0137523')).toBe('tt0137523');
    expect(normalizeImdbId('imdb:movie:tt0137523')).toBe('tt0137523');
  });

  it('strict parsing does not assume numeric provider', () => {
    expect(parseExternalId('550')).toEqual({});
    expect(parseExternalId(550)).toEqual({});
    expect(parseExternalId('tmdb:550')).toEqual({ tmdb: 550 });
  });

  it('builds typed provider refs from Stremio-style ids', () => {
    expect(buildProviderRefFromStremioId('series', 'tmdb:1')).toBe('tmdb:show:1');
    expect(buildProviderRefFromStremioId('movie', 'tt0137523')).toBe('imdb:movie:tt0137523');
    expect(buildProviderRefFromStremioId('series', 'tt0944947:1:2')).toBe('imdb:show:tt0944947');
  });

  it('formats ids for addon idPrefixes', () => {
    expect(formatIdForIdPrefixes('imdb:movie:tt0137523', 'movie', ['tt'])).toBe('tt0137523');
    expect(formatIdForIdPrefixes('imdb:show:tt0944947:1:2', 'series', ['tt'])).toBe('tt0944947:1:2');
    expect(formatIdForIdPrefixes('tmdb:show:1399:1:2', 'series', ['tmdb:'])).toBe('tmdb:1399:1:2');
    expect(formatIdForIdPrefixes('1399', 'series', ['tmdb:'])).toBe('tmdb:1399');
    expect(formatIdForIdPrefixes('imdb:movie:tt0137523', 'movie')).toBe('tt0137523');
  });
});
