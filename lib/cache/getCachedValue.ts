import { storeValue } from './storeValue';
import { checkCachedValue } from './checkCachedValue';

import { Cache, CacheEntry, Context } from './types';

type GetCachedValueReturn<Result> =
  | { result: CacheEntry<Result>; stale: boolean }
  | undefined;

async function getCachedValueFromCache<Params, Result>(
  cache: Cache<Result>,
  context: Context<Params, Result>
): Promise<GetCachedValueReturn<Result>> {
  const adapter = cache.name;

  context.report({ name: 'onGetCachedStart', adapter });

  try {
    const cachedEntry = await cache.get(context.cacheKey);

    const hasEntry = !!cachedEntry;
    const isFresh = hasEntry && checkCachedValue(cachedEntry);

    if (isFresh) {
      context.report({
        name: 'onGetCachedHit',
        adapter,
        result: cachedEntry.value,
      });

      return { result: cachedEntry, stale: false };
    }

    context.report({
      name: 'onGetCachedMiss',
      adapter,
    });

    return hasEntry ? { result: cachedEntry, stale: true } : undefined;
  } catch (error) {
    context.report({ name: 'onGetCachedError', error, adapter });
    return undefined;
  }
}

export async function getCachedValue<Params, Result>(
  caches: Array<Cache<Result>>,
  context: Context<Params, Result>
): Promise<GetCachedValueReturn<Result>> {
  let cachedResult: GetCachedValueReturn<Result>;

  let i = 0;
  const cachesCount = caches.length;
  for (; i < cachesCount; i++) {
    const cache = caches[i];
    const isLastCache = i === cachesCount - 1;
    const getCachedResult = await getCachedValueFromCache(cache, context);

    // if we haven't checked all adapters for a potential fresh entry
    // we need to continue the loop to try and find one
    if (!getCachedResult || (!isLastCache && getCachedResult.stale)) continue;

    cachedResult = getCachedResult;
    break;
  }

  // if we have a value we need to update the other adapters
  if (cachedResult && !cachedResult.stale) {
    storeValue(caches.slice(0, i), context, cachedResult.result.value);
  }

  return cachedResult;
}
