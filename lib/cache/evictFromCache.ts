import { Cache, Context } from './types';

async function evictFromCache<Params, Result>(
  cache: Cache<Result>,
  context: Context<Params, Result>
): Promise<void> {
  const adapter = cache.name;

  context.report({ name: 'onEvictStart', adapter });

  try {
    await cache.evict(context.cacheKey);
    context.report({ name: 'onEvictSuccess', adapter });
  } catch (error) {
    context.report({ name: 'onEvictError', error, adapter });
  }
}

export async function evictValue<Params, Result>(
  caches: Array<Cache<Result>>,
  context: Context<Params, Result>
): Promise<void> {
  const evictValuePromises = caches.map(cache =>
    evictFromCache(cache, context)
  );

  await Promise.all(evictValuePromises);
}
