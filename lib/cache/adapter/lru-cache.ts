import { Cache, CacheEntry } from '../types';

interface LRUCache {
  name: string;
  /**
   * Maximum number of results allowed to live in the cache at any time.
   *
   * The default cache eviction strategy is least recently used (LRU).
   *
   * @default 100
   */
  size?: number;
  /**
   * Time-To-Live of the cache entry in this adapter.
   * It's used to override the cache client's staleTime configuration.
   *
   * @default undefined
   */
  ttl?: number | (() => number);
}

export function lruCacheAdapter<Result = unknown>(
  config: LRUCache
): Cache<Result> {
  const { name, size = 100 } = config;

  const cache = new Map<string, CacheEntry<Result>>();
  const maxCacheSize = size;
  const ttl = typeof config.ttl === 'function' ? config.ttl() : config.ttl;

  function deleteStaleEntries() {
    const now = Date.now();

    cache.forEach((value, key) => {
      if (value.metadata.createdAt + value.metadata.ttl < now) {
        cache.delete(key);
      }
    });
  }

  function deleteLeastRecentlyUsedUntilBelowSizeLimit() {
    const entriesToEvict = cache.size - maxCacheSize;

    if (entriesToEvict <= 0) {
      return;
    }

    const entriesSortedByLastAccessedAt = [...cache.entries()].sort(
      ([, aVal], [, bVal]) =>
        aVal.metadata.lastAccessedAt - bVal.metadata.lastAccessedAt
    );

    for (let i = 0; i < entriesToEvict; i += 1) {
      const [key] = entriesSortedByLastAccessedAt[i];
      cache.delete(key);
    }
  }

  function ensureCacheSizeIsBelowLimit() {
    if (cache.size <= maxCacheSize) {
      return;
    }

    deleteStaleEntries();
    deleteLeastRecentlyUsedUntilBelowSizeLimit();
  }

  return {
    name: name || 'LRU',
    ttl,
    set(key, entry) {
      cache.set(key, entry);

      ensureCacheSizeIsBelowLimit();

      return entry.value;
    },
    get(key) {
      return cache.get(key);
    },
    evict(key) {
      cache.delete(key);
    },
  };
}
