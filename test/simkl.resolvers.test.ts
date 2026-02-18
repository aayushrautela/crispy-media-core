import { describe, expect, it } from 'vitest';

import { createImdbToSimklResolver, createMediaRouter, createSimklToTmdbResolver } from '../src/index';

describe('simkl resolvers', () => {
  it('resolves imdb -> simkl via /search/id', async () => {
    const fakeFetch: typeof fetch = (async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      expect(url).toContain('/search/id');
      expect(url).toContain('client_id=x');
      expect(url).toContain('imdb=tt0137523');

      return {
        ok: true,
        json: async () => [
          {
            type: 'movie',
            ids: { simkl: 999, tmdb: '550', imdb: 'tt0137523' },
          },
        ],
      } as unknown as Response;
    }) as typeof fetch;

    const router = createMediaRouter({
      resolvers: [createImdbToSimklResolver({ clientId: 'x', fetch: fakeFetch, baseUrl: 'https://example.com' })],
      enrichers: [],
    });

    const resolved = await router.resolveTo('simkl', 'imdb:movie:tt0137523');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value).toEqual({ provider: 'simkl', kind: 'movie', id: 999 });
    }
  });

  it('resolves simkl -> tmdb via /search/id', async () => {
    const fakeFetch: typeof fetch = (async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      expect(url).toContain('/search/id');
      expect(url).toContain('client_id=x');
      expect(url).toContain('simkl=999');

      return {
        ok: true,
        json: async () => [
          {
            type: 'movie',
            ids: { simkl: 999, tmdb: '550' },
          },
        ],
      } as unknown as Response;
    }) as typeof fetch;

    const router = createMediaRouter({
      resolvers: [createSimklToTmdbResolver({ clientId: 'x', fetch: fakeFetch, baseUrl: 'https://example.com' })],
      enrichers: [],
    });

    const resolved = await router.resolveTo('tmdb', 'simkl:movie:999');
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value).toEqual({ provider: 'tmdb', kind: 'movie', id: 550 });
    }
  });
});
