import type { MediaType } from '../domain/media';

import { buildEpisodeId } from './id';
import type { StremioVideo } from './types';

export const DEFAULT_IGNORE_BELOW_PERCENT = 2;
export const DEFAULT_COMPLETE_AT_PERCENT = 85;
export const DEFAULT_STALE_AFTER_DAYS = 30;

export interface EpisodeNumber {
  season: number;
  episode: number;
}

export interface WatchProgressEntry {
  type: MediaType;
  id: string;
  currentTime: number;
  duration: number;
  lastUpdated: number;
  episode?: EpisodeNumber;
  source?: string;
}

export interface ContinueWatchingItem extends WatchProgressEntry {
  /** 0..100 */
  progressPercent: number;
  /** True when this item is a synthetic “Up Next” placeholder. */
  isPlaceholder: boolean;
  /** True when progress reaches the completed threshold (typically means “ready for Up Next”). */
  isCompleted: boolean;
  /** Convenience Stremio episode id if `episode` exists. */
  episodeId?: string;
}

export interface ContinueWatchingOptions {
  nowMs?: number;
  ignoreBelowPercent?: number;
  completeAtPercent?: number;
  staleAfterDays?: number;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n <= 0) return 0;
  if (n >= 100) return 100;
  return n;
}

export function computeProgressPercent(currentTime: number, duration: number): number {
  const ct = Number.isFinite(currentTime) ? Math.max(0, currentTime) : 0;
  const d = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  if (!d) return 0;
  return clampPercent((ct / d) * 100);
}

export function episodeKey(episode: EpisodeNumber): string {
  return `${episode.season}:${episode.episode}`;
}

export function isStaleProgress(entry: Pick<WatchProgressEntry, 'lastUpdated'>, options: ContinueWatchingOptions = {}): boolean {
  const nowMs = options.nowMs ?? Date.now();
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS;

  if (!Number.isFinite(entry.lastUpdated)) return true;
  const ageMs = nowMs - entry.lastUpdated;
  return ageMs > staleAfterDays * 24 * 60 * 60 * 1000;
}

export function toContinueWatchingItem(entry: WatchProgressEntry, options: ContinueWatchingOptions = {}): ContinueWatchingItem | null {
  const ignoreBelowPercent = options.ignoreBelowPercent ?? DEFAULT_IGNORE_BELOW_PERCENT;
  const completeAtPercent = options.completeAtPercent ?? DEFAULT_COMPLETE_AT_PERCENT;

  if (!entry.id.trim()) return null;
  if (!Number.isFinite(entry.lastUpdated)) return null;

  if (isStaleProgress(entry, options)) return null;

  const progressPercent = computeProgressPercent(entry.currentTime, entry.duration);
  if (progressPercent < ignoreBelowPercent) return null;

  const isCompleted = progressPercent >= completeAtPercent;
  const isPlaceholder = false;

  const episodeId = entry.episode ? buildEpisodeId(entry.id, entry.episode.season, entry.episode.episode) : null;

  const out: ContinueWatchingItem = {
    ...entry,
    progressPercent,
    isCompleted,
    isPlaceholder,
  };

  if (episodeId) {
    out.episodeId = episodeId;
  }

  return out;
}

function sameEpisode(a: ContinueWatchingItem, b: ContinueWatchingItem): boolean {
  if (a.type !== 'series' || b.type !== 'series') return false;
  if (!a.episode || !b.episode) return false;
  return a.episode.season === b.episode.season && a.episode.episode === b.episode.episode;
}

function pickBetterCandidate(a: ContinueWatchingItem, b: ContinueWatchingItem): ContinueWatchingItem {
  // Prefer real progress over placeholders.
  if (a.isPlaceholder !== b.isPlaceholder) {
    return a.isPlaceholder ? b : a;
  }

  // For movies, higher progress wins.
  if (a.type === 'movie' && b.type === 'movie') {
    if (a.progressPercent !== b.progressPercent) {
      return a.progressPercent > b.progressPercent ? a : b;
    }
    return a.lastUpdated >= b.lastUpdated ? a : b;
  }

  // If they represent the same series episode, higher progress wins.
  if (sameEpisode(a, b)) {
    if (a.progressPercent !== b.progressPercent) {
      return a.progressPercent > b.progressPercent ? a : b;
    }

    return a.lastUpdated >= b.lastUpdated ? a : b;
  }

  // Otherwise, newer wins; tiebreaker higher progress.
  if (a.lastUpdated !== b.lastUpdated) {
    return a.lastUpdated > b.lastUpdated ? a : b;
  }

  return a.progressPercent >= b.progressPercent ? a : b;
}

/**
 * Merges raw progress entries into a per-content Continue Watching list.
 *
 * - Dedupe key is `${type}:${id}`.
 * - For series, if multiple episodes exist, newest `lastUpdated` wins.
 * - If the same episode exists from multiple sources, higher progress wins.
 */
export function mergeContinueWatching(entries: WatchProgressEntry[], options: ContinueWatchingOptions = {}): ContinueWatchingItem[] {
  const candidates: ContinueWatchingItem[] = [];
  for (const entry of entries) {
    const item = toContinueWatchingItem(entry, options);
    if (!item) continue;

    // Nuvio behavior: completed movies are not shown in Continue Watching.
    if (item.type === 'movie' && item.isCompleted) continue;
    candidates.push(item);
  }

  const byContent = new Map<string, ContinueWatchingItem>();
  for (const item of candidates) {
    const key = `${item.type}:${item.id}`;
    const existing = byContent.get(key);
    byContent.set(key, existing ? pickBetterCandidate(existing, item) : item);
  }

  return sortContinueWatching([...byContent.values()]);
}

export function sortContinueWatching(items: ContinueWatchingItem[]): ContinueWatchingItem[] {
  return [...items].sort((a, b) => {
    const aIsInProgress = !a.isPlaceholder && a.progressPercent > 0;
    const bIsInProgress = !b.isPlaceholder && b.progressPercent > 0;
    if (aIsInProgress !== bIsInProgress) return aIsInProgress ? -1 : 1;
    return b.lastUpdated - a.lastUpdated;
  });
}

export interface UpNextOptions {
  nowMs?: number;
  watchedEpisodeKeys?: Set<string>;
}

function parseReleasedToMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function bySeasonEpisode(a: EpisodeNumber, b: EpisodeNumber): number {
  if (a.season !== b.season) return a.season - b.season;
  return a.episode - b.episode;
}

function toEpisodeNumber(v: StremioVideo): EpisodeNumber | null {
  if (typeof v.season !== 'number' || typeof v.episode !== 'number') return null;
  const s = Math.trunc(v.season);
  const e = Math.trunc(v.episode);
  if (!Number.isFinite(s) || !Number.isFinite(e) || s <= 0 || e <= 0) return null;
  return { season: s, episode: e };
}

/**
 * Finds the next released, not-watched episode after `afterEpisode`.
 */
export function findUpNextEpisode(
  videos: StremioVideo[],
  afterEpisode: EpisodeNumber,
  options: UpNextOptions = {},
): EpisodeNumber | null {
  const nowMs = options.nowMs ?? Date.now();
  const watched = options.watchedEpisodeKeys;

  const numbered = videos
    .map((v) => {
      const ep = toEpisodeNumber(v);
      if (!ep) return null;
      const releasedMs = parseReleasedToMs(v.released);
      return { ep, releasedMs };
    })
    .filter((v): v is { ep: EpisodeNumber; releasedMs: number | null } => Boolean(v));

  numbered.sort((a, b) => bySeasonEpisode(a.ep, b.ep));

  for (const item of numbered) {
    if (bySeasonEpisode(item.ep, afterEpisode) <= 0) continue;
    if (typeof item.releasedMs === 'number' && item.releasedMs > nowMs) continue;
    if (watched?.has(episodeKey(item.ep))) continue;
    return item.ep;
  }

  return null;
}

/**
 * Creates a synthetic “Up Next” placeholder item for a series.
 */
export function createUpNextPlaceholder(
  showId: string,
  lastUpdated: number,
  afterEpisode: EpisodeNumber,
  videos: StremioVideo[],
  options: UpNextOptions = {},
): ContinueWatchingItem | null {
  const next = findUpNextEpisode(videos, afterEpisode, options);
  if (!next) return null;

  const episodeId = buildEpisodeId(showId, next.season, next.episode) ?? undefined;
  if (!episodeId) return null;

  return {
    type: 'series',
    id: showId,
    episode: next,
    episodeId,
    currentTime: 0,
    duration: 0,
    lastUpdated,
    progressPercent: 0,
    isPlaceholder: true,
    isCompleted: false,
  };
}
