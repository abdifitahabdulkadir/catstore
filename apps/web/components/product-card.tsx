import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RatingStars } from "@/components/rating-stars";
import { PLACEHOLDER_IMAGE } from "@/lib/config";
import type { Product } from "@/lib/products";

function quote(words: string[]) {
  return words.map((w) => `“${w}”`).join(", ");
}

function rankNote(rank?: number) {
  if (rank === 1) return "Ranked #1: the highest-scoring match.";
  if (rank === 2) return "Ranked #2: the second-highest score.";
  if (rank === 3) return "Ranked #3: the third-highest score.";
  return rank ? `Ranked #${rank.toLocaleString()} by score, highest first.` : "";
}

function matchNote(matched: Product["matched"]) {
  const name = matched?.name ?? [];
  const description = matched?.description ?? [];
  if (name.length && description.length)
    return `${quote(name)} matched the title (counts 3× more) and ${quote(description)} the description.`;
  if (name.length) return `${quote(name)} matched the title, which counts 3× more than the description.`;
  if (description.length) return `${quote(description)} matched only the description, so the score is lower.`;
  return "Matched a similar form of your search words.";
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="block">
      <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={product.image ?? PLACEHOLDER_IMAGE}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
          {product.score !== undefined && (
            <>
              <span className="peer absolute left-2 top-2 cursor-help rounded-full border bg-popover px-2 py-0.5 text-xs font-medium text-popover-foreground shadow-sm">
                Relevance {product.score.toFixed(2)}
              </span>
              <div
                role="tooltip"
                className="pointer-events-none absolute inset-x-2 top-10 z-10 rounded-md border bg-popover p-2 text-xs leading-snug text-popover-foreground opacity-0 shadow-lg transition-opacity peer-hover:opacity-100"
              >
                <p>{rankNote(product.rank)}</p>
                <p className="mt-1 text-muted-foreground">{matchNote(product.matched)}</p>
              </div>
            </>
          )}
        </div>
        <CardHeader>
          <CardTitle className="text-lg">{product.name}</CardTitle>
          <CardDescription className="line-clamp-2 text-base">{product.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <RatingStars rating={product.rating} />
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-lg font-semibold">${product.price.toFixed(2)}</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
