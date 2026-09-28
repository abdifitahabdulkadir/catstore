import { closeSync, openSync, readSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  image: string | null;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "products.ndjson");

// products.ndjson is >1.5GB — larger than the biggest string Node can hold in memory
// at once (V8 caps string length around ~536M characters), so it can't be loaded with
// readFileSync + JSON.parse. Instead it's read synchronously in bounded chunks, one
// JSON object per line, so no single string ever approaches that limit.
function loadProductsSync(filePath: string): Product[] {
  const fd = openSync(filePath, "r");
  const CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
  const buffer = Buffer.alloc(CHUNK_SIZE);
  const products: Product[] = [];
  let leftover = "";

  try {
    let bytesRead: number;
    while ((bytesRead = readSync(fd, buffer, 0, CHUNK_SIZE, null)) > 0) {
      const text = leftover + buffer.toString("utf-8", 0, bytesRead);
      const lines = text.split("\n");
      leftover = lines.pop() ?? "";
      for (const line of lines) {
        if (line) products.push(JSON.parse(line) as Product);
      }
    }
    if (leftover) products.push(JSON.parse(leftover) as Product);
  } finally {
    closeSync(fd);
  }

  return products;
}

// Holding 5M+ product objects in memory is the point (this stands in for a real
// database until Postgres is wired up), but it does mean the process needs a large
// heap — run the API with e.g. `NODE_OPTIONS=--max-old-space-size=4096` if it OOMs.
export const PRODUCTS: Product[] = loadProductsSync(DATA_FILE);
