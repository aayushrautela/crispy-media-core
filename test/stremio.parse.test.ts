import { describe, expect, it } from 'vitest';

import { parseStremioCatalogResponse, parseStremioMetaResponse } from '../src/index';

describe('stremio/parse', () => {
  it('parses a catalog response and normalizes ids', () => {
    const payload = {
      metas: [
        { id: 'TT0137523', type: 'movie', name: 'Fight Club' },
        { id: 550, type: 'movie', name: 'Some TMDB Movie' },
        { id: null, type: 'movie', name: 'Bad' },
      ],
    };

    const parsed = parseStremioCatalogResponse(payload, { assumeNumeric: 'tmdb' });
    expect(parsed?.metas.map((m) => m.id)).toEqual(['tt0137523', 'tmdb:550']);
  });

  it('parses meta videos and derives season/episode from id suffix', () => {
    const payload = {
      meta: {
        id: 'tt0944947',
        type: 'series',
        name: 'Some Show',
        videos: [{ id: 'tt0944947:1:1', title: 'Ep 1' }],
      },
    };

    const parsed = parseStremioMetaResponse(payload);
    expect(parsed?.meta.videos?.[0]?.season).toBe(1);
    expect(parsed?.meta.videos?.[0]?.episode).toBe(1);
  });
});
