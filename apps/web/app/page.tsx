"use client";

import { useDebouncedCallback } from "@tanstack/react-pacer";
import { Check, Search } from "lucide-react";
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
import { getProducts, type ProductPage } from "@/lib/api";
import { DEFAULT_PAGE, MAX_SEARCH_LENGTH } from "@/lib/config";
import { CATEGORIES } from "@/lib/products";

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

const SCORE_KEY = [
 { label: "Title match", note: "counts 3×" },
 { label: "Description match", note: "counts 1×" },
 { label: "Uncommon words", note: "score higher (“cookbook” beats “edition”)" },
 { label: "More of your words matched", note: "scores higher" },
 { label: "Shorter text", note: "scores higher (title beats description)" },
];

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
 const page = Math.max(DEFAULT_PAGE, Number.parseInt(searchParams.get("page") ?? "", 10) || DEFAULT_PAGE);

 const [search, setSearch] = useState(q);
 const [syncedQ, setSyncedQ] = useState(q);
 // Back/forward navigation changes the URL's q; reflect it in the input, but not when
 // the change came from our own debounced update (the user may have typed further since).
 if (q !== syncedQ) {
  setSyncedQ(q);
  if (q !== search.trim()) setSearch(q);
 }

 function updateUrl(changes: Record<string, string | undefined>, replace = false) {
  const next = new URLSearchParams(window.location.search) // read live: the debounced caller may hold stale props
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

 const [result, setResult] = useState<ProductPage | null>(null);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
  const controller = new AbortController();
  getProducts(
   { page, q: q || undefined, category: activeCategory === "all" ? undefined : activeCategory },
   controller.signal
  )
   .then((data) => {
    setResult(data);
    setError(null);
   })
   .catch((err: unknown) => {
    if (controller.signal.aborted) return;
    setResult(null);
    setError(err instanceof Error ? err.message : "Something went wrong");
   });

  return () => controller.abort();
 }, [page, q, activeCategory]);

 const products = result?.items ?? [];
 const total = result?.total ?? null;
 const totalPages = Math.max(1, result?.totalPages ?? 1);
 const currentPage = Math.min(page, totalPages);

 function goToPage(target: number) {
  if (target < DEFAULT_PAGE || target > totalPages) return;
  updateUrl({ page: target > DEFAULT_PAGE ? String(target) : undefined });
 }

 return (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
   <aside className="rounded-xl border-2 border-foreground/25 bg-transparent p-5">
    <h2 className="mb-4 text-center text-3xl font-bold text-foreground">How results are scored</h2>
    <ul className="grid gap-x-6 gap-y-3 text-lg italic leading-snug text-foreground/85 sm:grid-cols-2 lg:grid-cols-3">
     {SCORE_KEY.map(({ label, note }) => (
      <li key={label} className="flex items-start gap-3">
       <Check className="mt-1 size-5 shrink-0 text-foreground" />
       <span>
        <b className="font-semibold text-foreground">{label}</b> {note}
       </span>
      </li>
     ))}
    </ul>
   </aside>

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
      onChange={(event) => {
       setSearch(event.target.value);
       commitSearch(event.target.value);
      }}
      placeholder="Search products..."
      className="h-14 pl-11 text-lg"
     />
    </div>
   </header>

   <div className="flex flex-wrap justify-center gap-2">
    <Button
     variant={activeCategory === "all" ? "default" : "outline"}
     onClick={() => updateUrl({ category: undefined, page: undefined })}
    >
     All
    </Button>
    {CATEGORIES.map((category) => (
     <Button
      key={category.slug}
      variant={activeCategory === category.slug ? "default" : "outline"}
      onClick={() => updateUrl({ category: category.slug, page: undefined })}
     >
      {category.name}
     </Button>
    ))}
   </div>

   <p className="text-center text-base text-muted-foreground">
    {error ?? (total === null ? "Loading products..." : `${total.toLocaleString()} product${total === 1 ? "" : "s"} found${result?.tookMs !== undefined ? ` in ${result.tookMs} ms` : ""}${q && total > 0 ? " · sorted by relevance, highest first" : ""}`)}
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
        aria-disabled={currentPage <= DEFAULT_PAGE}
        tabIndex={currentPage <= DEFAULT_PAGE ? -1 : undefined}
        className={currentPage <= DEFAULT_PAGE ? "pointer-events-none opacity-50" : undefined}
        onClick={(event) => {
         event.preventDefault();
         goToPage(currentPage - 1);
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
         goToPage(currentPage + 1);
        }}
       />
      </PaginationItem>
     </PaginationContent>
    </Pagination>
   )}
  </div>
 );
}
