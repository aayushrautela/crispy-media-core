import { describe, expect, it } from 'vitest';

import { createImdbToTmdbResolver, createMediaRouter } from '../src/index';

describe('router', () => {
  it('resolves imdb -> tmdb via resolver graph', async () => {
    const fakeFetch: typeof fetch = (async () => {
      return {
        ok: true,
        json: async () => ({ movie_results: [{ id: 123 }], tv_results: [] }),
      } as unknown as Response;
    }) as typeof fetch;

    const router = createMediaRouter({
      resolvers: [createImdbToTmdbResolver({ apiKey: 'x', fetch: fakeFetch, baseUrl: 'https://example.com' })],
      enrichers: [],
    });

    const resolved = await router.resolveTo('tmdb', 'imdb:movie:tt0137523');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value).toEqual({ provider: 'tmdb', kind: 'movie', id: 123 });
    }
  });

  it('rejects bad ids', async () => {
    const router = createMediaRouter({});
    const res = await router.resolveTo('tmdb', 'tmdb:550');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('BAD_ID');
    }
  });
});
