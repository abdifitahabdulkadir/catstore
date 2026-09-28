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
import type { Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="block">
      <Card className="overflow-hidden pt-0 transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full bg-muted">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
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
