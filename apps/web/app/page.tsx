"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { Search } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Pagination,
 PaginationContent,
 PaginationEllipsis,
 PaginationItem,
 PaginationLink,
 PaginationNext,
 PaginationPrevious,
} from "@/components/ui/pagination";
import { streamProducts } from "@/lib/api";
import { CATEGORIES, MAX_SEARCH_LENGTH, type Product } from "@/lib/products";

// With up to 200,000 pages, show first, last and a window around the current page.
function pageWindow(current: number, total: number): (number | "gap")[] {
 const pages = new Set([1, total, current - 1, current, current + 1]);
 const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
 const result: (number | "gap")[] = [];
 sorted.forEach((p, i) => {
  if (i > 0 && p - sorted[i - 1] > 1) result.push("gap");
  result.push(p);
 });
 return result;
}

export default function Home() {
 // useSearchParams needs a Suspense boundary so the rest of the page can prerender.
 return (
  <Suspense>
   <ProductBrowser />
  </Suspense>
 );
}

// page, category and search text live in the URL (?page=3&category=books&q=coffee), so
// they survive a refresh and can be shared.
function ProductBrowser() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const q = (searchParams.get("q") ?? "").slice(0, MAX_SEARCH_LENGTH);
 const categoryParam = searchParams.get("category");
 const activeCategory = CATEGORIES.some((c) => c.slug === categoryParam) ? categoryParam! : "all";
 const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "", 10) || 1);

 const [search, setSearch] = useState(q);
 const [syncedQ, setSyncedQ] = useState(q);
 // Back/forward navigation changes the URL's q; reflect it in the input, but not when
 // the change came from our own debounced update (the user may have typed further since).
 if (q !== syncedQ) {
  setSyncedQ(q);
  if (q !== search.trim()) setSearch(q);
 }

 function updateUrl(changes: Record<string, string | undefined>, replace = false) {
  const next = new URLSearchParams(window.location.search) // read live: the debounced caller may hold stale props;
  for (const [key, value] of Object.entries(changes)) {
   if (value) next.set(key, value);
   else next.delete(key);
  }
  const qs = next.toString();
  const href = qs ? `${pathname}?${qs}` : pathname;
  if (replace) router.replace(href, { scroll: false });
  else router.push(href, { scroll: false });
 }

 const commitSearch = useDebouncedCallback(
  (value: string) => updateUrl({ q: value.trim() || undefined, page: undefined }, true),
  { wait: 500 }
 );

 const [products, setProducts] = useState<Product[]>([]);
 const [total, setTotal] = useState<number | null>(null);
 const [totalPages, setTotalPages] = useState(1);
 const [error, setError] = useState<string | null>(null);

 // Products are appended as each line of the NDJSON stream arrives.
 useEffect(() => {
  const controller = new AbortController();
  streamProducts(
   {
    page,
    q: q || undefined,
    category: activeCategory === "all" ? undefined : activeCategory,
   },
   {
    // The previous page stays visible until the new page's first line arrives.
    onMeta: (meta) => {
     setProducts([]);
     setError(null);
     setTotal(meta.total);
     setTotalPages(Math.max(1, meta.totalPages));
    },
    onProduct: (product) => setProducts((current) => [...current, product]),
   },
   controller.signal
  )
   .catch((err: unknown) => {
    if (controller.signal.aborted) return;
    setProducts([]);
    setError(err instanceof Error ? err.message : "Something went wrong");
   });

  return () => controller.abort();
 }, [page, q, activeCategory]);

 const currentPage = total === null ? page : Math.min(page, totalPages);

 function handleCategoryChange(slug: string) {
  updateUrl({ category: slug === "all" ? undefined : slug, page: undefined });
 }

 function handleSearchChange(value: string) {
  setSearch(value);
  commitSearch(value);
 }

 function goToPage(target: number) {
  updateUrl({ page: target > 1 ? String(target) : undefined });
 }

 return (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
   <header className="flex flex-col items-center gap-6 text-center">
    <div className="space-y-2">
     <h1 className="flex items-center justify-center gap-2 text-4xl font-bold tracking-tight sm:text-5xl">
      <Image src="/logo.png" alt="Catstore logo" width={36} height={36} className="size-8 rounded-md sm:size-9" />
      Catstore
     </h1>
     <p className="text-lg text-muted-foreground">Everything you need, all in one place.</p>
    </div>
    <div className="relative w-full max-w-xl">
     <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
     <Input
      value={search}
      maxLength={MAX_SEARCH_LENGTH}
      onChange={(event) => handleSearchChange(event.target.value)}
      placeholder="Search products..."
      className="h-14 pl-11 text-lg"
     />
    </div>
   </header>

   <div className="flex flex-wrap justify-center gap-2">
    <Button
     variant={activeCategory === "all" ? "default" : "outline"}
     onClick={() => handleCategoryChange("all")}
    >
     All
    </Button>
    {CATEGORIES.map((category) => (
     <Button
      key={category.slug}
      variant={activeCategory === category.slug ? "default" : "outline"}
      onClick={() => handleCategoryChange(category.slug)}
     >
      {category.name}
     </Button>
    ))}
   </div>

   <p className="text-center text-base text-muted-foreground">
    {error ?? (total === null ? "Loading products..." : `${total.toLocaleString()} product${total === 1 ? "" : "s"} found`)}
   </p>

   <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
    {products.map((product) => (
     <ProductCard key={product.id} product={product} />
    ))}
   </div>

   {totalPages > 1 && (
    <Pagination>
     <PaginationContent>
      <PaginationItem>
       <PaginationPrevious
        href="#"
        aria-disabled={currentPage <= 1}
        tabIndex={currentPage <= 1 ? -1 : undefined}
        className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
        onClick={(event) => {
         event.preventDefault();
         if (currentPage <= 1) return;
         goToPage(Math.max(1, currentPage - 1));
        }}
       />
      </PaginationItem>
      {pageWindow(currentPage, totalPages).map((entry, index) =>
       entry === "gap" ? (
        <PaginationItem key={`gap-${index}`}>
         <PaginationEllipsis />
        </PaginationItem>
       ) : (
        <PaginationItem key={entry}>
         <PaginationLink
          href="#"
          isActive={entry === currentPage}
          size="default"
          className="min-w-8 px-2.5"
          onClick={(event) => {
           event.preventDefault();
           goToPage(entry);
          }}
         >
          {entry.toLocaleString()}
         </PaginationLink>
        </PaginationItem>
       )
      )}
      <PaginationItem>
       <PaginationNext
        href="#"
        aria-disabled={currentPage >= totalPages}
        tabIndex={currentPage >= totalPages ? -1 : undefined}
        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
        onClick={(event) => {
         event.preventDefault();
         if (currentPage >= totalPages) return;
         goToPage(Math.min(totalPages, currentPage + 1));
        }}
       />
      </PaginationItem>
     </PaginationContent>
    </Pagination>
   )}
  </div>
 );
}
