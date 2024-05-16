import { CacheEntry } from './types';

export function checkCachedValue<Result>(entry: CacheEntry<Result>): boolean {
  const now = Date.now();

  const isFresh = entry.metadata.createdAt + entry.metadata.ttl > now;

  // this is used for memory lru adapter
  if (isFresh) {
    // eslint-disable-next-line no-param-reassign
    entry.metadata.lastAccessedAt = now;
  }

  return isFresh;
}
