import { storeValue } from './storeValue';
import { evictValue } from './evictFromCache';
import { getCachedValue } from './getCachedValue';

import type { CacheConfig, Context } from './types';

interface CachedClient<Params, Result> {
  fetch(params: Params, config?: { fresh?: boolean }): Promise<Result>;
}

const DEFAULT_STALE_TIME = Infinity;

function ensurePositiveValidNumber(
  number: unknown,
  fallback: number,
  min = 0
): number {
  return typeof number === 'number' &&
    !Number.isNaN(number) &&
    number >= min &&
    number < Number.MAX_SAFE_INTEGER
    ? number
    : fallback;
}

function buildClient<Params, Result>(
  config: CacheConfig<Params, Result>
): CachedClient<Params, Result> {
  const caches = Array.isArray(config.cache) ? config.cache : [config.cache];

  let getStaleTime: () => number;

  if (typeof config?.staleTime === 'function') {
    getStaleTime = config.staleTime;
  } else {
    const staleTime = ensurePositiveValidNumber(
      config?.staleTime,
      DEFAULT_STALE_TIME
    );
    getStaleTime = () => staleTime;
  }

  function createCacheContext(params: Params): Context<Params, Result> {
    const now = Date.now();
    const contextWithoutReport = {
      cacheKey: config.cacheKey(params),
      cacheName: config.cacheName,
      params,
      metadata: {
        ttl: getStaleTime(),
        createdAt: now,
        lastAccessedAt: now,
      },
    };

    const report = config.reporter
      ? config.reporter(params)(contextWithoutReport)
      : () => () => () => {};

    return {
      ...contextWithoutReport,
      report,
    };
  }

  async function fetchUpstream(context: Context<Params, Result>) {
    context.report({ name: 'onFetchStart' });

    const result = await config.fetch(context);

    context.report({ name: 'onFetchSuccess', result });

    return result;
  }

  async function getFreshValue(
    context: Context<Params, Result>
  ): Promise<Result> {
    const freshResult = await fetchUpstream(context);

    if (config.isCacheable?.(context, freshResult) ?? true) {
      context.cacheKey = config.cacheKey(context.params, freshResult);
      await storeValue(caches, context, freshResult);
    } else {
      context.report({ name: 'onStoreSkip' });
    }

    return freshResult;
  }

  async function fetch(
    params: Params,
    fetchConfig: { fresh?: boolean } = { fresh: false }
  ): Promise<Result> {
    const context = createCacheContext(params);

    if (fetchConfig.fresh) {
      context.report({ name: 'onSkip' });
      return getFreshValue(context);
    }

    const getCachedResult = await getCachedValue(caches, context);

    const hasCachedValue = !!getCachedResult;
    const cachedValueIsFresh = hasCachedValue && !getCachedResult.stale;

    if (hasCachedValue && cachedValueIsFresh) {
      return getCachedResult.result.value;
    }

    try {
      return await getFreshValue(context);
    } catch (error) {
      context.report({ name: 'onFetchError', error });

      if (hasCachedValue) {
        if (config.serveStaleHitOnError) {
          context.report({ name: 'onStaleHitFromError' });
          storeValue(caches, context, getCachedResult.result.value);
          return getCachedResult.result.value;
        }
        // We have a stale hit ready for cache eviction
        evictValue(caches, context);
      }

      // TODO: This method was created to offer a default state for CN on error. It should be removed when no longer needed
      // If there is a default result we return it to be cached
      const defaultResult = config.failoverOnTimeout?.(context, error as any);
      if (!!defaultResult) {
        return defaultResult;
      }

      throw error;
    }
  }

  return {
    fetch,
  };
}

export { buildClient };
export type { CachedClient };
