import { API_URL } from "@/lib/config";
import type { Product } from "@/lib/products";

export type ProductPage = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function getProducts(
  params: { page: number; q?: string; category?: string },
  signal?: AbortSignal,
): Promise<ProductPage> {
  const url = new URL("/products", API_URL);
  url.searchParams.set("page", String(params.page));
  if (params.q) url.searchParams.set("q", params.q);
  if (params.category) url.searchParams.set("category", params.category);

  const res = await fetch(url, { signal });
  if (res.status === 429) throw new Error("Too many requests — please slow down a moment.");
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export async function getProductDetail(id: number): Promise<Product | null> {
  const res = await fetch(new URL(`/products/${id}`, API_URL), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
