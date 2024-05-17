import { ItemDefinition } from "@azure/cosmos";
import { client } from "@/lib/cosmos-db/client";
import type { Cache, CacheEntry } from "../types";

interface CosmosDbCache {
  name: string;
  databaseId: string;
}

async function fetchFirstItemByNameAndValue(databaseId: string, name: string, value: string) {
  const querySpec = {
    query: `SELECT * FROM ${databaseId} p WHERE p.${name} = @${name}`,
    parameters: [
      {
        name: `@${name}`,
        value,
      },
    ],
  };
  const { resources } = await client.database(databaseId).container(databaseId).items.query(querySpec).fetchAll();
  return resources?.[0];
}

async function insertItemByValue(databaseId: string, value: ItemDefinition) {
  await client.database(databaseId).container(databaseId).items.upsert(value);
}

async function replaceItemByIdAndValue(databaseId: string, id: string, value: ItemDefinition) {
  await client
    .database(databaseId)
    .container(databaseId)
    .item(id)
    .replace({ ...value, id });
}

async function deleteItemById(databaseId: string, id: string) {
  await client.database(databaseId).container(databaseId).item(id).delete();
}

export function cosmosDbAdapter<Result = unknown>({ name, databaseId }: CosmosDbCache): Cache<Result> {
  return {
    name: name || "cosmos-db",
    async get(key) {
      const slug = key.split("-")[2];
      const item = await fetchFirstItemByNameAndValue(databaseId, "slug", slug);
      if (!item) {
        return undefined;
      }
      return {
        value: item,
      } as CacheEntry<Result>;
    },
    async set(key, { value }) {
      const slug = key.split("-")[2];
      const item = await fetchFirstItemByNameAndValue(databaseId, "slug", slug);
      if (!item) {
        await insertItemByValue(databaseId, value as ItemDefinition);
      } else {
        await replaceItemByIdAndValue(databaseId, item.id, value as ItemDefinition);
      }
      return value;
    },
    async evict(key) {
      const slug = key.split("-")[2];
      const item = await fetchFirstItemByNameAndValue(databaseId, "slug", slug);
      await deleteItemById(databaseId, item.id);
    },
  };
}
