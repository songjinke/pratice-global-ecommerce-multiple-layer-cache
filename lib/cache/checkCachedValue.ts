import { CacheEntry } from "./types";

export function checkCachedValue<Result>(entry: CacheEntry<Result>): boolean {
  if (!entry.metadata) {
    return true;
  }

  // this is used for memory lru adapter
  const now = Date.now();
  const isFresh = entry.metadata.createdAt + entry.metadata.ttl > now;
  if (isFresh) {
    entry.metadata.lastAccessedAt = now;
  }
  return isFresh;
}
