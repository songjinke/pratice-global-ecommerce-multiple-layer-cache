import { Cache, Context } from './types';

async function storeValueInCache<Params, Result>(
  cache: Cache<Result>,
  context: Context<Params, Result>,
  result: Result
): Promise<boolean> {
  const adapter = cache.name;

  context.report({ name: 'onStoreStart', adapter });

  try {
    const ttl = cache.ttl || context.metadata.ttl;
    await cache.set(context.cacheKey, {
      value: result,
      metadata: {
        ...context.metadata,
        ttl,
      },
    });

    context.report({
      name: 'onStoreSuccess',
      result,
      cacheKey: context.cacheKey,
      adapter,
      ttl,
    });

    return true;
  } catch (error) {
    context.report({ name: 'onStoreError', error, adapter });
    return false;
  }
}

export async function storeValue<Params, Result>(
  caches: Array<Cache<Result>>,
  context: Context<Params, Result>,
  result: Result
): Promise<boolean> {
  const storeValuePromises = caches.map(cache =>
    storeValueInCache(cache, context, result)
  );

  const results = await Promise.all(storeValuePromises);

  return results.reduce((acc, curr) => acc || curr, false);
}
