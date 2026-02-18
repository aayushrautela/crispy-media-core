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

  it('prefixes https:// for scheme-less trakt CDN URLs', () => {
    const normalized = normalizeTraktItem({
      movie: {
        title: 'Test',
        ids: { trakt: 1, imdb: 'tt0137523' },
        images: { poster: ['media.trakt.tv/images/movies/001/000/015/posters/medium/a0b95ac0c6.jpg.webp'] },
      },
    } as any);

    expect(normalized?.images.poster).toBe(
      'https://media.trakt.tv/images/movies/001/000/015/posters/medium/a0b95ac0c6.jpg.webp'
    );
  });

  it('keeps episode items show-scoped ids and show artwork', () => {
    const normalized = normalizeTraktItem({
      progress: 12.5,
      paused_at: '2020-01-01T00:00:00.000Z',
      episode: {
        season: 1,
        number: 2,
        title: 'Pilot (Part 2)',
        ids: { trakt: 999, tmdb: 6698721 },
        images: { thumb: ['media.trakt.tv/images/shows/000/000/123/thumbs/medium/episode.jpg.webp'] },
      },
      show: {
        title: 'Test Show',
        year: 2020,
        ids: { trakt: 123, tmdb: 424242 },
        images: {
          poster: ['media.trakt.tv/images/shows/000/000/123/posters/medium/show.jpg.webp'],
          fanart: ['media.trakt.tv/images/shows/000/000/123/fanarts/medium/show.jpg.webp'],
          logo: ['media.trakt.tv/images/shows/000/000/123/logos/medium/show.png.webp'],
        },
      },
    } as any);

    expect(normalized?.traktType).toBe('episode');
    expect(normalized?.type).toBe('series');

    // Episode items should be keyed by show id + episode context.
    expect(normalized?.id).toBe('tmdb:show:424242:1:2');

    // Top-level ids are show-scoped (stable across episodes).
    expect(normalized?.ids).toEqual({ trakt: 123, tmdb: 424242 });
    expect((normalized as any)?.showIds).toEqual({ trakt: 123, tmdb: 424242 });
    expect((normalized as any)?.episodeIds).toEqual({ trakt: 999, tmdb: 6698721 });

    // Keep show artwork stable; episode screenshot is attached as thumbnail.
    expect(normalized?.images.poster).toBe('https://media.trakt.tv/images/shows/000/000/123/posters/medium/show.jpg.webp');
    expect(normalized?.images.backdrop).toBe('https://media.trakt.tv/images/shows/000/000/123/fanarts/medium/show.jpg.webp');
    expect(normalized?.images.logo).toBe('https://media.trakt.tv/images/shows/000/000/123/logos/medium/show.png.webp');
    expect(normalized?.images.thumbnail).toBe('https://media.trakt.tv/images/shows/000/000/123/thumbs/medium/episode.jpg.webp');
  });
});
