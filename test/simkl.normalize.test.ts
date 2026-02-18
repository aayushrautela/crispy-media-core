import { describe, expect, it } from 'vitest';

import { normalizeSimklItem } from '../src/index';

describe('simkl normalize', () => {
  it('coerces ids and builds Simkl poster URLs', () => {
    const normalized = normalizeSimklItem({
      type: 'movie',
      title: 'John Wick: Chapter 2',
      poster: '74/74415673dcdc9cdd',
      year: 2017,
      status: 'released',
      ids: {
        simkl_id: 471618,
        slug: 'john-wick-chapter-2',
        tmdb: '324552',
      },
    } as any);

    expect(normalized?.type).toBe('movie');
    expect(normalized?.simklType).toBe('movie');
    expect(normalized?.ids).toEqual({ simkl: 471618, slug: 'john-wick-chapter-2', tmdb: 324552 });
    expect(normalized?.id).toBe('tmdb:324552');
    expect(normalized?.images.poster).toBe('https://simkl.in/posters/74/74415673dcdc9cdd_ca.webp');
    expect(normalized?.images.posters).toContain('https://simkl.in/posters/74/74415673dcdc9cdd_ca.webp');
  });

  it('normalizes playback episode items to show-scoped ids + episode suffix', () => {
    const normalized = normalizeSimklItem({
      id: 123,
      progress: 45.5,
      paused_at: '2024-01-15T10:30:00.000Z',
      type: 'episode',
      episode: {
        season: 1,
        episode: 5,
        title: 'Episode 5',
        tvdb_season: 1,
        tvdb_number: 5,
      },
      show: {
        title: 'Breaking Bad',
        year: 2008,
        poster: '51/abc',
        fanart: '51/def',
        ids: {
          simkl: 12345,
          slug: 'breaking-bad',
          tmdb: 1429,
          imdb: 'tt0903747',
        },
      },
    } as any);

    expect(normalized?.type).toBe('series');
    expect(normalized?.simklType).toBe('episode');
    expect(normalized?.id).toBe('tt0903747:1:5');
    expect(normalized?.episode).toEqual({ season: 1, episode: 5, title: 'Episode 5' });
    expect(normalized?.playbackProgress).toBe(45.5);
    expect(normalized?.pausedAt).toBe('2024-01-15T10:30:00.000Z');
    expect(normalized?.simklPlaybackId).toBe(123);
    expect(normalized?.showTitle).toBe('Breaking Bad');
    expect(normalized?.images.poster).toBe('https://simkl.in/posters/51/abc_ca.webp');
    expect(normalized?.images.backdrop).toBe('https://simkl.in/fanart/51/def_mobile.webp');
  });
});
