import { describe, expect, it } from 'vitest';

import {
  buildSimklHistoryAddPayload,
  buildSimklHistoryRemovePayload,
  buildSimklShowEpisodeHistoryAddPayload,
  buildSimklShowEpisodeHistoryRemovePayload,
} from '../src/index';

describe('simkl payloads', () => {
  it('builds minimal /sync/history payloads', () => {
    expect(buildSimklHistoryAddPayload('movie', { imdb: 'tt0137523' })).toEqual({
      movies: [{ ids: { imdb: 'tt0137523' } }],
    });
  });

  it('builds show episode history payloads using season/episode numbers', () => {
    expect(buildSimklShowEpisodeHistoryAddPayload({ imdb: 'tt0903747' }, 1, 5, '2014-09-01T09:10:11Z')).toEqual({
      shows: [
        {
          ids: { imdb: 'tt0903747' },
          seasons: [
            {
              number: 1,
              watched_at: '2014-09-01T09:10:11Z',
              episodes: [{ number: 5 }],
            },
          ],
        },
      ],
    });
  });

  it('builds /sync/history/remove payloads', () => {
    expect(buildSimklHistoryRemovePayload('movie', { tmdb: 550 })).toEqual({
      movies: [{ ids: { tmdb: 550 } }],
    });

    expect(buildSimklShowEpisodeHistoryRemovePayload({ imdb: 'tt0903747' }, 1, 5)).toEqual({
      shows: [
        {
          ids: { imdb: 'tt0903747' },
          seasons: [{ number: 1, episodes: [{ number: 5 }] }],
        },
      ],
    });
  });

  it('validates ratings', () => {
    expect(() => buildSimklHistoryAddPayload('movie', { imdb: 'tt0137523' }, { rating: 11 })).toThrow(
      'Rating must be between 1 and 10'
    );
  });
});
