import { describe, expect, it } from 'vitest';

import { parseMediaIdInput } from '../src/index';

describe('ids/mediaId', () => {
  it('canonicalizes typed ids to Stremio-style ids', () => {
    expect(parseMediaIdInput('tmdb:movie:550').canonicalId).toBe('tmdb:550');
    expect(parseMediaIdInput('imdb:show:tt0944947:1:1').canonicalId).toBe('tt0944947:1:1');
    expect(parseMediaIdInput('tmdb:show:1399:1:2').canonicalId).toBe('tmdb:1399:1:2');
  });

  it('handles numeric inputs safely', () => {
    expect(parseMediaIdInput(550).canonicalId).toBe('550');
    expect(parseMediaIdInput(550, { assumeNumeric: 'tmdb' }).canonicalId).toBe('tmdb:550');
  });

  it('supports loose IMDb normalization when enabled', () => {
    expect(parseMediaIdInput('123').canonicalId).toBe('123');
    expect(parseMediaIdInput('123', { looseImdb: true }).canonicalId).toBe('tt123');
  });
});
