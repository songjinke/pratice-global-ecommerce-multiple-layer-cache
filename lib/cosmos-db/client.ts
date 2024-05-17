import { CosmosClient } from "@azure/cosmos";

const options = {
  endpoint: "https://global-ecommercie-multiple-layer-cache.documents.azure.com:443/",
  key: "AB2dxCqeH5cWrALlKXx4q3FaaH23fZRKUb3vY24HN2WrfLhIJodqP1MgM8xS1FCaKz4QkPjjEGJJACDbReSL9w==",
  userAgentSuffix: "GlobalEcommerceMultipleLayer",
};
const client = new CosmosClient(options);

export { client };
