import { describe, expect, it } from 'vitest';

import { buildEpisodeId, normalizeStremioId, parseEpisodeIdSuffix } from '../src/index';

describe('stremio/id', () => {
  it('normalizes IMDb ids', () => {
    expect(normalizeStremioId('tt0137523')).toBe('tt0137523');
    expect(normalizeStremioId('TT0137523')).toBe('tt0137523');
    expect(normalizeStremioId('imdb:movie:tt0137523')).toBe('tt0137523');
    expect(normalizeStremioId('imdb:show:tt0944947:1:1')).toBe('tt0944947:1:1');
  });

  it('normalizes TMDB typed ids to Stremio ids', () => {
    expect(normalizeStremioId('tmdb:movie:550')).toBe('tmdb:550');
    expect(normalizeStremioId('tmdb:show:1399:1:2')).toBe('tmdb:1399:1:2');
  });

  it('handles numeric inputs', () => {
    expect(normalizeStremioId(550)).toBe('550');
    expect(normalizeStremioId(550, { assumeNumeric: 'tmdb' })).toBe('tmdb:550');
  });

  it('parses episode suffixes', () => {
    expect(parseEpisodeIdSuffix('tt0944947:1:1')).toEqual({ baseId: 'tt0944947', season: 1, episode: 1 });
    expect(parseEpisodeIdSuffix('tmdb:1399:1:2')).toEqual({ baseId: 'tmdb:1399', season: 1, episode: 2 });
    expect(parseEpisodeIdSuffix('tmdb:1399')).toEqual({ baseId: 'tmdb:1399' });
  });

  it('builds episode ids', () => {
    expect(buildEpisodeId('tt0944947', 1, 1)).toBe('tt0944947:1:1');
    expect(buildEpisodeId(' ', 1, 1)).toBeNull();
    expect(buildEpisodeId('tt0944947', 0, 1)).toBeNull();
  });
});
