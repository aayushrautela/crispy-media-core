# @crispy-streaming/media-core

Shared, platform-agnostic media domain package for Crispy clients.

## Install

```bash
npm install @crispy-streaming/media-core
```

## Purpose

This package centralizes:

- canonical media types,
- TMDB/Trakt normalization,
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

## Scripts

- `npm run typecheck`
- `npm run build`
- `npm pack --dry-run`

## Usage

```ts
import {
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

let details: MediaDetails | null = null;
if (trakt) {
  // pass TMDB details payload and image payload from your own API client
  // details = normalizeTmdbDetails(tmdbPayload, trakt.type, tmdbImagesPayload)
}
```

## Package Metadata

- `repository`, `bugs`, and `homepage` in `package.json` currently use placeholders.
- Replace `<your-org>` when moving this folder into the dedicated GitHub repository.

## Publish Preparation (for new repo)

Before publishing from a dedicated repository:

1. Replace placeholder repository links in `package.json`.
2. Finalize package scope/name.
3. Add CI for typecheck/test/build.
4. Publish prerelease (`0.x`) first.
