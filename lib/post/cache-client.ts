import getConfig from "next/config";

import { fetchGraphQL, POST_GRAPHQL_FIELDS, extractPost } from "@/lib/api";
import { buildClient } from "@/lib/cache";
// import { dynamoDbAdapter } from '~/lib/cache/adapter/dynamodb';
import { lruCacheAdapter } from "@/lib/cache/lru-cache";

import type { Post } from "@/app/types";

const POSTS_CACHE_VERSION = 1;
const CACHE_NAME = "posts";
const TABLE_NAME = process.env.DISTRIBUTED_CACHE_TABLE_NAME || "content-distributed-cache";
const POSTS_CACHE_STALE_TIME_MS = 300000;
const POSTS_MEMORY_CACHE_STALE_TIME_MS = 600000;

const memoryAdapter = lruCacheAdapter<Post>({
  name: "lru-posts",
  ttl: () => POSTS_MEMORY_CACHE_STALE_TIME_MS,
});

// const dynamoAdapter = dynamoDbAdapter<Footer>({
//   name: 'dynamo-posts',
//   tableName: TABLE_NAME,
// });

type Params = {
  slug: string;
  preview?: boolean;
};

const cachedClient = buildClient<Params, Post>({
  cache: memoryAdapter,
  // : [memoryAdapter, dynamoAdapter],
  cacheName: CACHE_NAME,
  serveStaleHitOnError: true,

  reporter: () => {
    return ({ cacheKey }) =>
      (event) => {
        if (process.env.NODE_ENV === "development") {
          switch (event.name) {
            case "onGetCachedHit":
              console.log(`reporter:${event.name}:${cacheKey}:${JSON.stringify(event.result)}`);
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
    return `v${POSTS_CACHE_VERSION}-${CACHE_NAME}-${slug}-${preview}`;
  },
  isCacheable(_, result) {
    return !!result;
  },
  staleTime() {
    return POSTS_CACHE_STALE_TIME_MS;
  },
});

export { cachedClient };
