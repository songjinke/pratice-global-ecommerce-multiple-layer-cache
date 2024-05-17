import { fetchGraphQL, POST_GRAPHQL_FIELDS, extractPost } from "@/lib/api";
import { buildClient } from "@/lib/cache";
import { cosmosDbAdapter } from "@/lib/cache/adapter/cosmosdb";
import { lruCacheAdapter } from "@/lib/cache/adapter/lru-cache";

import type { Post } from "@/app/types";

const POST_CACHE_VERSION = 1;
const CACHE_NAME = "post";
const POST_CACHE_STALE_TIME_MS = 300000;
const POST_MEMORY_CACHE_STALE_TIME_MS = 10000;

const memoryAdapter = lruCacheAdapter<Post>({
  name: "lru-posts",
  ttl: () => POST_MEMORY_CACHE_STALE_TIME_MS,
});

const cosmosAdapter = cosmosDbAdapter<Post>({
  name: "cosmos-db-post",
  databaseId: "Post",
});

type Params = {
  slug: string;
  preview?: boolean;
};

const cachedClient = buildClient<Params, Post>({
  cache: [memoryAdapter, cosmosAdapter],
  cacheName: CACHE_NAME,
  serveStaleHitOnError: true,

  reporter: () => {
    return ({ cacheKey }) =>
      (event) => {
        if (process.env.NODE_ENV === "development") {
          switch (event.name) {
            case "onGetCachedHit":
              console.log(`reporter:${event.name}:${cacheKey}
  :${event.adapter}
  :${JSON.stringify(event.result)}`);
            default:
              console.log(`reporter:${event.name}:${cacheKey}`);
          }
        }
      };
  },

  async fetch({ params }) {
    const { slug, preview = false } = params;
    const entry = await fetchGraphQL(
      `query {
      postCollection(where: { slug: "${slug}" }, preview: ${preview ? "true" : "false"}, limit: 1) {
        items {
          ${POST_GRAPHQL_FIELDS}
        }
      }
    }`,
      preview
    );
    return extractPost(entry);
  },
  cacheKey({ slug, preview = false }) {
    return `v${POST_CACHE_VERSION}-${CACHE_NAME}-${slug}-${preview}`;
  },
  isCacheable(_, result) {
    return !!result;
  },
  staleTime() {
    return POST_CACHE_STALE_TIME_MS;
  },
});

export { cachedClient };
