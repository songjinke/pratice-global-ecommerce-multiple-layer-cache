export interface CacheMetadata {
  readonly createdAt: number;
  readonly ttl: number;
  lastAccessedAt: number;
}

export interface CacheEntry<Result = unknown> {
  metadata: CacheMetadata;
  value: Result;
}

export interface Cache<Result = unknown> {
  name: string;
  ttl?: number;
  get: (
    key: string
  ) => CacheEntry<Result> | Promise<CacheEntry<Result> | undefined> | undefined;
  set: (key: string, value: CacheEntry<Result>) => Result | Promise<Result>;
  evict: (key: string) => void | Promise<void>;
}

export type OnGetCachedStart = { name: 'onGetCachedStart'; adapter: string };
export type OnGetCachedHit<Result> = {
  name: 'onGetCachedHit';
  result: Result;
  adapter: string;
};
export type OnGetCachedMiss = { name: 'onGetCachedMiss'; adapter: string };
export type OnGetCachedError = {
  name: 'onGetCachedError';
  error: unknown;
  adapter: string;
};
export type OnSkip = { name: 'onSkip' };
export type OnFetchStart = { name: 'onFetchStart' };
export type OnFetchSuccess<Result> = { name: 'onFetchSuccess'; result: Result };
export type OnFetchError = { name: 'onFetchError'; error: unknown };
export type OnStoreStart = { name: 'onStoreStart'; adapter: string };
export type OnStoreSkip = { name: 'onStoreSkip' };
export type OnStoreSuccess<Result> = {
  name: 'onStoreSuccess';
  result: Result;
  cacheKey: string;
  adapter: string;
  ttl: number;
};
export type OnStoreError = {
  name: 'onStoreError';
  error: unknown;
  adapter: string;
};
export type OnStaleHitFromError = { name: 'onStaleHitFromError' };
export type OnEvictStart = { name: 'onEvictStart'; adapter: string };
export type OnEvictSuccess = { name: 'onEvictSuccess'; adapter: string };
export type OnEvictError = {
  name: 'onEvictError';
  error: unknown;
  adapter: string;
};
export type OnCustomEvent = {
  name: 'onCustom';
  message: string;
};

export type CacheEvent<Result> =
  | OnGetCachedStart
  | OnGetCachedHit<Result>
  | OnGetCachedMiss
  | OnGetCachedError
  | OnFetchStart
  | OnFetchSuccess<Result>
  | OnFetchError
  | OnStoreStart
  | OnStoreSkip
  | OnStoreSuccess<Result>
  | OnStoreError
  | OnSkip
  | OnStaleHitFromError
  | OnEvictStart
  | OnEvictSuccess
  | OnEvictError
  | OnCustomEvent;

export type Reporter<Result> = (event: CacheEvent<Result>) => void;

export interface Context<Params, Result> {
  cacheKey: string;
  readonly cacheName: string;
  readonly params: Params;
  readonly metadata: CacheMetadata;
  readonly report: Reporter<Result>;
}

export type CreateReporter<Params, Result> = (
  context: Omit<Context<Params, Result>, 'report'>
) => Reporter<Result>;

export interface CacheConfig<Params, Result> {
  cache: Cache<Result> | Array<Cache<Result>>;
  cacheName: string;
  /**
   * Maximum number of miliseconds a result is allowed to live
   * in the cache before being considered stale and being evicted.
   *
   * Negative numbers equal Infinity (ie. cache forever) while zero
   * means don't cache (efectively always returning fresh results).
   *
   * @default Infinity
   */
  staleTime?: number | (() => number);
  /**
   * If this is set to true the cache will not delete the previous entry
   * on a missed hit. It will serve the previous value currently present in
   * cache and increase its lifespan for 10 minutes.
   *
   * @default false
   */
  serveStaleHitOnError?: boolean;
  /**
   * Fetch function that is used to fetch fresh values to populate cache.
   *
   * @param context Cache context that contains information about current request
   */
  fetch(context: Context<Params, Result>): Promise<Result>;
  /**
   * Function that calculates the cache key for the cache entry.
   *
   * @param params Params passed to each request
   * @param result Result fetched from `fetch`
   */
  cacheKey(params: Params, result?: Result): string;
  /**
   * Will be given the params and corresponding result before storing
   * the latter in the cache, to decide if it should be cached or not.
   *
   * @default () => true
   */
  isCacheable?(context: Context<Params, Result>, result: Result): boolean;
  // TODO: This method was created to offer a default state for CN on error. It should be removed when no longer needed
  failoverOnTimeout?(
    context: Context<Params, Result>,
    error: any
  ): Result | null;
  /**
   * Creator function for the cache reporter
   */
  reporter?: (params: Params) => CreateReporter<Params, Result>;
}
