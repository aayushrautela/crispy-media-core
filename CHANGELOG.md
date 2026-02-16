# Changelog

All notable changes to this project are documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [0.1.0] - 2026-02-14

### Added

- Initial package scaffold for `@crispy-streaming/media-core`.
- Canonical domain types for media, images, IDs, and episode context.
- TMDB normalization contracts and parser.
- Trakt normalization contracts and parser.
- External ID parsing, media-type normalization, and canonical ID helpers.

## [0.2.0] - 2026-02-15

### Changed

- BREAKING: strict ID parsing by default; bare numeric inputs are no longer assumed to be TMDB.

### Added

- `tvdb:` and `simkl:` id prefix parsing.
- `parseExternalIdLegacy()` and `parseMediaIdInputLegacy()` for legacy numeric-as-TMDB behavior.

## [0.3.2] - 2026-02-16

### Fixed

- Trakt image URLs under `/images/...` are now resolved against `https://walter.trakt.tv` (instead of TMDB).

### Added

- `formatIdForIdPrefixes()` helper for selecting Stremio addon-compatible IDs using `idPrefixes`.

## [0.3.0] - 2026-02-15

### Changed

- BREAKING: normalized media ids produced by this package are now typed as `provider:kind:id` (and episodes may include `:<season>:<episode>` suffix).
- BREAKING: a strict provider id for routing/enrichment is now `provider:kind:id` (not `provider:id`).

### Added

- `ProviderRef` + helpers: `parseProviderRefStrict()`, `parseProviderRefLoose()`, `formatProviderRef()`.
- Canonical typed id helpers: `buildCanonicalMediaId()` and `buildCanonicalMediaIdFromMediaType()`.
- Provider router: `createMediaRouter()` with pluggable `ProviderResolver` and `ProviderEnricher`.
- TMDB resolver edge: `createImdbToTmdbResolver()` (IMDB -> TMDB via `/find`).
- Coercion helpers for migration: `coerceProviderRef()` and `coerceProviderRefFromMediaType()`.
