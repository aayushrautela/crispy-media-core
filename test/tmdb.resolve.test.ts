import { describe, expect, it } from 'vitest';

import { resolveTmdbId } from '../src/tmdb/resolve';

describe('resolveTmdbId', () => {
  it('does not fetch external ids for tmdb input by default', async () => {
    const fetchMock = async () => {
      throw new Error('fetch should not be called');
    };

    const resolved = await resolveTmdbId('tmdb:movie:550', 'movie', {
      apiKey: 'k',
      fetch: fetchMock as unknown as typeof fetch,
    });

    expect(resolved.tmdbId).toBe(550);
    expect(resolved.imdbId).toBeUndefined();
  });

  it('optionally resolves imdb id for tmdb input', async () => {
    const calls: string[] = [];
    const fetchMock = async (url: string | URL) => {
      const value = typeof url === 'string' ? url : url.toString();
      calls.push(value);

      return {
        ok: true,
        json: async () => ({ imdb_id: 'tt0137523' }),
      } as unknown as Response;
    };

    const resolved = await resolveTmdbId('tmdb:movie:550', 'movie', {
      apiKey: 'k',
      fetch: fetchMock as unknown as typeof fetch,
      baseUrl: 'https://api.themoviedb.org/3',
      resolveImdbForTmdbId: true,
    });

    expect(resolved.tmdbId).toBe(550);
    expect(resolved.imdbId).toBe('tt0137523');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('/movie/550/external_ids?api_key=k');
  });

  it('falls back to tmdb id when external id lookup fails', async () => {
    const fetchMock = async () => ({ ok: false }) as unknown as Response;

    const resolved = await resolveTmdbId('tmdb:show:1399', 'series', {
      apiKey: 'k',
      fetch: fetchMock as unknown as typeof fetch,
      resolveImdbForTmdbId: true,
    });

    expect(resolved.tmdbId).toBe(1399);
    expect(resolved.imdbId).toBeUndefined();
  });
});
