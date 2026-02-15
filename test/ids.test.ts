import { describe, expect, it } from 'vitest';

import {
  buildCanonicalMediaId,
  normalizeImdbId,
  parseExternalId,
  parseExternalIdLegacy,
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
    expect(parseExternalIdLegacy('550')).toEqual({ tmdb: 550 });
    expect(parseExternalIdLegacy(550)).toEqual({ tmdb: 550 });
  });

  it('builds typed canonical ids', () => {
    expect(buildCanonicalMediaId({ tmdb: 1 }, 'show')).toBe('tmdb:show:1');
    expect(buildCanonicalMediaId({ trakt: 2, tmdb: 1 }, 'movie')).toBe('tmdb:movie:1');
    expect(buildCanonicalMediaId({ imdb: 'tt0137523', tmdb: 1 }, 'movie')).toBe('imdb:movie:tt0137523');
  });
});
