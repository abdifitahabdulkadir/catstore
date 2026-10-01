// Streams the synthetic products straight into Elasticsearch via the bulk API —
// nothing is written to disk and only a few MB of products are in memory at once.
// Recreates the index on every run. Usage: pnpm seed:elastic [total]

import { Client } from "@elastic/elasticsearch";
import { generateProducts, TOTAL_DEFAULT } from "./lib/products-generator.mjs";

const TOTAL = Number(process.argv[2] ?? TOTAL_DEFAULT);
const INDEX = process.env.ELASTICSEARCH_INDEX ?? "products";

const client = new Client({
  node: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME ?? "elastic",
    password: process.env.ELASTICSEARCH_PASSWORD ?? "admin",
  },
});

await client.indices.delete({ index: INDEX, ignore_unavailable: true });
await client.indices.create({
  index: INDEX,
  settings: {
    number_of_shards: 1,
    // Faster bulk load; restored below.
    number_of_replicas: 0,
    refresh_interval: "-1",

  },
  mappings: {
    properties: {
      id: { type: "integer" },
      categoryRank: { type: "integer" },
      name: { type: "text", analyzer: "english" },
      description: { type: "text", analyzer: "english" },
      category: { type: "keyword" },
      tags: { type: "keyword" },
      price: { type: "float" },
      rating: { type: "float" },
      image: { type: "keyword", index: false },
    },
  },
});

// The bulk helper only accepts async generators, so adapt the sync one (yielding to the
// event loop periodically so request I/O keeps flowing).
async function* products() {
  let n = 0;
  for (const product of generateProducts(TOTAL)) {
    yield product;
    if (++n % 5000 === 0) await new Promise((r) => setImmediate(r));
  }
}

const started = Date.now();
const result = await client.helpers.bulk({
  datasource: products(),
  onDocument: (doc) => ({ index: { _index: INDEX, _id: String(doc.id) } }),
  flushBytes: 8 * 1024 * 1024,
  concurrency: 3,
  onDrop: (d) => console.error("dropped", d.status, JSON.stringify(d.error)),
});

await client.indices.putSettings({ index: INDEX, settings: { refresh_interval: "1s" } });
await client.indices.refresh({ index: INDEX });
const { count } = await client.count({ index: INDEX });
console.log(`Indexed ${result.successful} (failed ${result.failed}); index holds ${count} docs in ${((Date.now() - started) / 1000).toFixed(0)}s`);
