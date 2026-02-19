# @crispy-streaming/media-core

Shared, platform-agnostic media domain + ID + Stremio helpers for Crispy clients.

## Install

```bash
npm install @crispy-streaming/media-core
```

## What This Package Includes

- Stremio/Nuvio-style content IDs + episode suffix helpers
- Stremio addon payload types + best-effort parsers
- Continue Watching / Up Next pure utilities
- TMDB/Trakt/Simkl contracts + normalizers (normalized ids are Stremio-style)
- Optional provider routing helpers for enrichment

This package intentionally excludes:

- React/React Native UI
- client-side state management
- storage and auth persistence
- API key handling

## Folder Layout

- `src/domain/*`: canonical domain models
- `src/ids/*`: cross-provider ID helpers
- `src/stremio/*`: Stremio types + parsers + Continue Watching helpers
- `src/tmdb/*`: TMDB contracts + normalizers
- `src/trakt/*`: Trakt contracts + normalizers
- `src/simkl/*`: Simkl contracts + normalizers + payload builders

## ID Model (Stremio/Nuvio)

Identity is the pair `(type, id)`.

`id` is a Stremio-style content id:

```txt
tt0137523
tt0944947
tmdb:550
trakt:1
simkl:12345
```

Episodes are represented with a Stremio-style suffix:

```txt
tt0944947:1:1
tmdb:1399:1:2
```

Helpers:

```ts
import { buildEpisodeId, normalizeStremioId, parseEpisodeIdSuffix } from '@crispy-streaming/media-core';

normalizeStremioId('imdb:show:tt0944947'); // -> 'tt0944947'
normalizeStremioId('tmdb:movie:550'); // -> 'tmdb:550'

buildEpisodeId('tt0944947', 1, 1); // -> 'tt0944947:1:1'
parseEpisodeIdSuffix('tt0944947:1:1'); // -> { baseId: 'tt0944947', season: 1, episode: 1 }
```

### Numeric IDs

By default, bare numeric inputs like `"123"` or `123` are not assumed to be TMDB/Trakt/SIMKL.

If you *know* a number is TMDB, pass an assumption:

```ts
import { normalizeStremioId } from '@crispy-streaming/media-core';

normalizeStremioId(550); // -> '550'
normalizeStremioId(550, { assumeNumeric: 'tmdb' }); // -> 'tmdb:550'
```

## Stremio Types + Parsers

This package includes lightweight Stremio types (`StremioManifest`, `StremioMeta`, `StremioVideo`, etc) and best-effort parsers for addon responses:

```ts
import {
  parseStremioCatalogResponse,
  parseStremioMetaResponse,
  parseStremioStreamResponse,
  parseStremioSubtitlesResponse,
} from '@crispy-streaming/media-core';

const catalog = parseStremioCatalogResponse(await res.json());
const meta = parseStremioMetaResponse(await res.json());
const streams = parseStremioStreamResponse(await res.json());
const subtitles = parseStremioSubtitlesResponse(await res.json());
```

## Continue Watching / Up Next

Pure utilities for building a Nuvio-like Continue Watching list:

```ts
import {
  createUpNextPlaceholder,
  mergeContinueWatching,
  type WatchProgressEntry,
} from '@crispy-streaming/media-core';

const merged = mergeContinueWatching(progressEntries);

// If you have Stremio meta videos + watched episode keys:
const upNext = createUpNextPlaceholder(
  'tt0944947',
  Date.now(),
  { season: 1, episode: 1 },
  meta.videos ?? [],
  { watchedEpisodeKeys: new Set(['1:1']) },
);
```

## Provider Routing (Enrichment)

For cross-provider enrichment (e.g. IMDb -> TMDB), use typed provider refs:

```txt
imdb:movie:tt0137523
imdb:show:tt0944947
tmdb:movie:550
tmdb:show:1399
```

Convert a Stremio-style id into a typed provider ref:

```ts
import { buildProviderRefFromStremioId } from '@crispy-streaming/media-core';

const typed = buildProviderRefFromStremioId('movie', 'tt0137523');
// -> 'imdb:movie:tt0137523'
```

Then use the router with resolvers/enrichers provided by your app:

```ts
import { createImdbToSimklResolver, createImdbToTmdbResolver, createMediaRouter } from '@crispy-streaming/media-core';

const router = createMediaRouter({
  resolvers: [
    createImdbToTmdbResolver({ apiKey: process.env.TMDB_API_KEY! }),
    createImdbToSimklResolver({ clientId: process.env.SIMKL_CLIENT_ID! }),
  ],
  enrichers: [
    // app-provided enrichers for tmdb/trakt/simkl
  ],
});

// router.enrich('tmdb', 'imdb:movie:tt0137523')
```

## Scripts

- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npm pack --dry-run`

## Package Metadata

- Repository: `https://github.com/aayushrautela/crispy-media-core`
- npm: `https://www.npmjs.com/package/@crispy-streaming/media-core`
