import type { MediaDetails } from '../domain/media';
import { parseProviderRefStrict, type ProviderName, type ProviderRef } from '../ids/providerRef';
import { parseEpisodeIdSuffix } from '../ids/mediaId';

export type RouterErrorCode =
  | 'BAD_ID'
  | 'UNSUPPORTED'
  | 'UNRESOLVABLE'
  | 'NOT_FOUND'
  | 'PROVIDER_ERROR';

export interface RouterError {
  code: RouterErrorCode;
  message: string;
  cause?: unknown;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: RouterError };

export interface ResolveContext {
  signal?: AbortSignal;
}

export interface ProviderResolver {
  from: ProviderName;
  to: ProviderName;
  resolve: (input: ProviderRef, context?: ResolveContext) => Promise<ProviderRef | null>;
}

export interface ProviderEnricher {
  provider: ProviderName;
  enrich: (input: ProviderRef, context?: ResolveContext) => Promise<MediaDetails>;
}

export interface MediaRouter {
  resolveTo: (target: ProviderName, input: ProviderRef | string, context?: ResolveContext) => Promise<Result<ProviderRef>>;
  enrich: (target: ProviderName, input: ProviderRef | string, context?: ResolveContext) => Promise<Result<MediaDetails>>;
}

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err(code: RouterErrorCode, message: string, cause?: unknown): Result<never> {
  return { ok: false, error: { code, message, cause } };
}

function parseInput(input: ProviderRef | string): ProviderRef | null {
  if (typeof input !== 'string') return input;
  const parsedSuffix = parseEpisodeIdSuffix(input);
  const ref = parseProviderRefStrict(parsedSuffix.baseId);
  if (!ref) return null;

  if (typeof parsedSuffix.season === 'number' && typeof parsedSuffix.episode === 'number') {
    return { ...ref, season: parsedSuffix.season, episode: parsedSuffix.episode };
  }

  return ref;
}

export function createMediaRouter(config: { resolvers?: ProviderResolver[]; enrichers?: ProviderEnricher[] }): MediaRouter {
  const resolvers = config.resolvers ?? [];
  const enrichers = config.enrichers ?? [];

  const enricherMap = new Map<ProviderName, ProviderEnricher>();
  for (const enricher of enrichers) {
    enricherMap.set(enricher.provider, enricher);
  }

  const edges = new Map<ProviderName, ProviderResolver[]>();
  for (const r of resolvers) {
    const list = edges.get(r.from) ?? [];
    list.push(r);
    edges.set(r.from, list);
  }

  async function resolveTo(target: ProviderName, input: ProviderRef | string, context?: ResolveContext): Promise<Result<ProviderRef>> {
    const start = parseInput(input);
    if (!start) {
      return err('BAD_ID', 'Invalid provider id; expected `provider:kind:id`.');
    }

    if (start.provider === target) {
      return ok(start);
    }

    // BFS by provider; keep the latest ref for each provider.
    const queue: ProviderRef[] = [start];
    const visited = new Set<ProviderName>([start.provider]);

    while (queue.length) {
      const current = queue.shift();
      if (!current) break;

      const nextResolvers = edges.get(current.provider) ?? [];
      for (const resolver of nextResolvers) {
        if (visited.has(resolver.to)) {
          continue;
        }

        let next: ProviderRef | null = null;
        try {
          next = await resolver.resolve(current, context);
        } catch (e) {
          return err('PROVIDER_ERROR', `Resolver ${resolver.from} -> ${resolver.to} failed.`, e);
        }

        if (!next) {
          continue;
        }

        if (next.provider === target) {
          return ok(next);
        }

        visited.add(next.provider);
        queue.push(next);
      }
    }

    return err('UNRESOLVABLE', `No resolver path found to ${target}.`);
  }

  async function enrich(target: ProviderName, input: ProviderRef | string, context?: ResolveContext): Promise<Result<MediaDetails>> {
    const enricher = enricherMap.get(target);
    if (!enricher) {
      return err('UNSUPPORTED', `No enricher registered for ${target}.`);
    }

    const resolved = await resolveTo(target, input, context);
    if (!resolved.ok) {
      return resolved;
    }

    try {
      return ok(await enricher.enrich(resolved.value, context));
    } catch (e) {
      return err('PROVIDER_ERROR', `${target} enricher failed.`, e);
    }
  }

  return { resolveTo, enrich };
}
