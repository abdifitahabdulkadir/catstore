import type { Product } from "@/lib/products";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type StreamLine =
  | ({ type: "meta" } & PageMeta)
  | { type: "product"; product: Product }
  | { type: "error"; message: string };

// Reads GET /products/stream (NDJSON) and calls back as each line arrives, so products
// render one by one instead of waiting for the whole page.
export async function streamProducts(
  params: { page: number; q?: string; category?: string },
  handlers: { onMeta: (meta: PageMeta) => void; onProduct: (product: Product) => void },
  signal: AbortSignal,
): Promise<void> {
  const url = new URL("/products/stream", API_URL);
  url.searchParams.set("page", String(params.page));
  if (params.q) url.searchParams.set("q", params.q);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, { signal });
  if (res.status === 429) throw new Error("Too many requests — please slow down a moment.");
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (; ;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      const msg = JSON.parse(line) as StreamLine;
      if (msg.type === "meta") handlers.onMeta(msg);
      else if (msg.type === "product") handlers.onProduct(msg.product);
      else throw new Error(msg.message);
    }
  }
}

export async function fetchProduct(id: number): Promise<Product | null> {
  const res = await fetch(new URL(`/products/${id}`, API_URL), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
