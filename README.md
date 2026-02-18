# @crispy-streaming/media-core

Shared, platform-agnostic media domain package for Crispy clients.

## Install

```bash
npm install @crispy-streaming/media-core
```

## Purpose

This package centralizes:

- canonical media types,
- TMDB/Trakt/Simkl normalization,
- external ID parsing and canonicalization.

This package intentionally excludes:

- React/React Native UI,
- client-side state management,
- storage and auth persistence,
- API key handling.

## Folder Layout

- `src/domain/*`: canonical domain models
- `src/ids/*`: cross-provider ID helpers
- `src/tmdb/*`: TMDB contracts + normalizers
- `src/trakt/*`: Trakt contracts + normalizers
- `src/simkl/*`: Simkl contracts + normalizers + payload builders

## Strict ID parsing (recommended)

By default, bare numeric inputs like `"123"` or `123` are treated as **unknown** (not assumed to be TMDB/Trakt/TVDB/SIMKL). This avoids mixing provider namespaces across apps.

Use explicit, typed IDs:

```txt
tmdb:movie:550
tmdb:show:1399
trakt:movie:1
trakt:show:1
tvdb:show:121361
simkl:movie:12345
imdb:movie:tt0137523
imdb:show:tt0944947
```

This package intentionally does not support "bare numeric = TMDB" behavior. Always prefix provider ids (e.g. `tmdb:movie:550`).

## Provider routing

For cross-provider enrichment (e.g. Trakt/Simkl -> TMDB), use the router and register resolver/enricher plugins in your app:

```ts
import { createImdbToSimklResolver, createImdbToTmdbResolver, createMediaRouter } from '@crispy-streaming/media-core';

const router = createMediaRouter({
  resolvers: [
    createImdbToTmdbResolver({ apiKey: process.env.TMDB_API_KEY! }),
    createImdbToSimklResolver({ clientId: process.env.SIMKL_CLIENT_ID! }),
  ],
  enrichers: [
    // app-provided enrichers for tmdb/trakt/tvdb/simkl
  ],
});

// strict input format (preferred):
// router.enrich('tmdb', 'imdb:movie:tt0137523')
```

## Scripts

- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

## Usage

```ts
import {
  buildSimklHistoryAddPayload,
  normalizeSimklItem,
  normalizeTmdbDetails,
  normalizeTraktItem,
  parseExternalId,
  type MediaDetails,
} from '@crispy-streaming/media-core';

const ids = parseExternalId('tmdb:550');

const trakt = normalizeTraktItem({
  movie: {
    title: 'Fight Club',
    year: 1999,
    ids: { tmdb: 550, imdb: 'tt0137523' },
  },
});

const simkl = normalizeSimklItem({
  type: 'movie',
  title: 'Fight Club',
  year: 1999,
  poster: '74/74415673dcdc9cdd',
  ids: { simkl: 53536, imdb: 'tt0137523', tmdb: 550 },
});

if (simkl) {
  // Example payload for `POST /sync/history`:
  const payload = buildSimklHistoryAddPayload('movie', simkl.ids, { watchedAt: new Date().toISOString() });
  void payload;
}

let details: MediaDetails | null = null;
if (trakt) {
  // pass TMDB details payload and image payload from your own API client
  // details = normalizeTmdbDetails(tmdbPayload, trakt.type, tmdbImagesPayload)
}
```

## Package Metadata

- Repository: `https://github.com/aayushrautela/crispy-media-core`
- npm: `https://www.npmjs.com/package/@crispy-streaming/media-core`

## Publish Preparation (for new repo)

Before publishing from a dedicated repository:

1. Replace placeholder repository links in `package.json`.
2. Finalize package scope/name.
3. Add CI for typecheck/test/build.
4. Publish prerelease (`0.x`) first.
