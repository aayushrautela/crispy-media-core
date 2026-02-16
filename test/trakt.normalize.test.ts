import { describe, expect, it } from 'vitest';

import { normalizeTraktItem } from '../src/index';

describe('trakt normalize', () => {
  it('resolves /images URLs against walter.trakt.tv', () => {
    const normalized = normalizeTraktItem({
      movie: {
        title: 'Test',
        ids: { trakt: 1, imdb: 'tt0137523' },
        images: { poster: { full: '/images/posters/test.jpg' } },
      },
    } as any);

    expect(normalized?.images.poster).toBe('https://walter.trakt.tv/images/posters/test.jpg');
  });

  it('resolves TMDB-style relative paths against image.tmdb.org', () => {
    const normalized = normalizeTraktItem({
      movie: {
        title: 'Test',
        ids: { trakt: 1, imdb: 'tt0137523' },
        images: { poster: { full: '/abc123.jpg' } },
      },
    } as any);

    expect(normalized?.images.poster).toBe('https://image.tmdb.org/t/p/original/abc123.jpg');
  });

  it('prefixes https: for protocol-relative URLs', () => {
    const normalized = normalizeTraktItem({
      movie: {
        title: 'Test',
        ids: { trakt: 1, imdb: 'tt0137523' },
        images: { poster: { full: '//walter.trakt.tv/images/posters/test.jpg' } },
      },
    } as any);

    expect(normalized?.images.poster).toBe('https://walter.trakt.tv/images/posters/test.jpg');
  });
});
