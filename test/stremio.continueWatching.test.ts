import { describe, expect, it } from 'vitest';

import {
  createUpNextPlaceholder,
  findUpNextEpisode,
  mergeContinueWatching,
  sortContinueWatching,
  type ContinueWatchingItem,
  type WatchProgressEntry,
} from '../src/index';

describe('stremio/continueWatching', () => {
  const now = 1_700_000_000_000;

  it('ignores tiny progress below threshold', () => {
    const entries: WatchProgressEntry[] = [
      { type: 'movie', id: 'tt0137523', currentTime: 1, duration: 100, lastUpdated: now },
    ];
    expect(mergeContinueWatching(entries, { nowMs: now })).toEqual([]);
  });

  it('drops completed movies', () => {
    const entries: WatchProgressEntry[] = [
      { type: 'movie', id: 'tt0137523', currentTime: 90, duration: 100, lastUpdated: now },
    ];
    expect(mergeContinueWatching(entries, { nowMs: now })).toEqual([]);
  });

  it('for movies, higher progress wins even if older', () => {
    const entries: WatchProgressEntry[] = [
      { type: 'movie', id: 'tt0137523', currentTime: 60, duration: 100, lastUpdated: now - 2_000 },
      { type: 'movie', id: 'tt0137523', currentTime: 40, duration: 100, lastUpdated: now - 1_000 },
    ];

    const merged = mergeContinueWatching(entries, { nowMs: now, completeAtPercent: 95 });
    expect(merged).toHaveLength(1);
    expect(Math.round(merged[0]!.progressPercent)).toBe(60);
  });

  it('for series, newer episode wins when episodes differ', () => {
    const entries: WatchProgressEntry[] = [
      {
        type: 'series',
        id: 'tt0944947',
        episode: { season: 1, episode: 1 },
        currentTime: 10,
        duration: 100,
        lastUpdated: now - 2_000,
      },
      {
        type: 'series',
        id: 'tt0944947',
        episode: { season: 1, episode: 2 },
        currentTime: 5,
        duration: 100,
        lastUpdated: now - 1_000,
      },
    ];

    const merged = mergeContinueWatching(entries, { nowMs: now });
    expect(merged).toHaveLength(1);
    expect(merged[0]!.episode).toEqual({ season: 1, episode: 2 });
  });

  it('for series, higher progress wins when the same episode differs by source', () => {
    const entries: WatchProgressEntry[] = [
      {
        type: 'series',
        id: 'tt0944947',
        episode: { season: 1, episode: 1 },
        currentTime: 40,
        duration: 100,
        lastUpdated: now - 2_000,
      },
      {
        type: 'series',
        id: 'tt0944947',
        episode: { season: 1, episode: 1 },
        currentTime: 30,
        duration: 100,
        lastUpdated: now - 1_000,
      },
    ];

    const merged = mergeContinueWatching(entries, { nowMs: now });
    expect(merged).toHaveLength(1);
    expect(Math.round(merged[0]!.progressPercent)).toBe(40);
  });

  it('finds Up Next episode respecting release date + watched set', () => {
    const videos = [
      { id: 'tt0944947:1:1', season: 1, episode: 1, released: '2020-01-01' },
      { id: 'tt0944947:1:2', season: 1, episode: 2, released: '2020-01-02' },
      { id: 'tt0944947:1:3', season: 1, episode: 3, released: '2999-01-01' },
    ];

    const t = Date.parse('2020-01-03T00:00:00Z');

    expect(findUpNextEpisode(videos, { season: 1, episode: 1 }, { nowMs: t })).toEqual({ season: 1, episode: 2 });
    expect(
      findUpNextEpisode(videos, { season: 1, episode: 1 }, { nowMs: t, watchedEpisodeKeys: new Set(['1:2']) }),
    ).toBeNull();
  });

  it('creates an Up Next placeholder item', () => {
    const videos = [
      { id: 'tt0944947:1:1', season: 1, episode: 1, released: '2020-01-01' },
      { id: 'tt0944947:1:2', season: 1, episode: 2, released: '2020-01-02' },
    ];
    const t = Date.parse('2020-01-03T00:00:00Z');

    const placeholder = createUpNextPlaceholder('tt0944947', now, { season: 1, episode: 1 }, videos, { nowMs: t });
    expect(placeholder?.isPlaceholder).toBe(true);
    expect(placeholder?.episodeId).toBe('tt0944947:1:2');
  });

  it('sorts in-progress items before placeholders', () => {
    const inProgress: ContinueWatchingItem = {
      type: 'series',
      id: 'tt0944947',
      episode: { season: 1, episode: 1 },
      episodeId: 'tt0944947:1:1',
      currentTime: 10,
      duration: 100,
      lastUpdated: now,
      progressPercent: 10,
      isPlaceholder: false,
      isCompleted: false,
    };

    const placeholder: ContinueWatchingItem = {
      type: 'series',
      id: 'tt0944947',
      episode: { season: 1, episode: 2 },
      episodeId: 'tt0944947:1:2',
      currentTime: 0,
      duration: 0,
      lastUpdated: now - 1,
      progressPercent: 0,
      isPlaceholder: true,
      isCompleted: false,
    };

    const sorted = sortContinueWatching([placeholder, inProgress]);
    expect(sorted[0]!.episodeId).toBe('tt0944947:1:1');
  });
});
