import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, "..", "src", "data", "products.ndjson");

const names = new Set();
const descriptions = new Set();
const ids = new Set();
const categoryCounts = {};
let count = 0;
let dupNames = 0;
let dupDescriptions = 0;
let dupIds = 0;

const rl = createInterface({ input: createReadStream(FILE, { encoding: "utf-8" }), crlfDelay: Infinity });

for await (const line of rl) {
  if (!line) continue;
  const product = JSON.parse(line);
  count += 1;
  if (names.has(product.name)) dupNames += 1;
  else names.add(product.name);
  if (descriptions.has(product.description)) dupDescriptions += 1;
  else descriptions.add(product.description);
  if (ids.has(product.id)) dupIds += 1;
  else ids.add(product.id);
  categoryCounts[product.category] = (categoryCounts[product.category] ?? 0) + 1;
}

console.log("total lines:", count);
console.log("unique names:", names.size, "duplicate names:", dupNames);
console.log("unique descriptions:", descriptions.size, "duplicate descriptions:", dupDescriptions);
console.log("unique ids:", ids.size, "duplicate ids:", dupIds);
console.log("category counts:", categoryCounts);
