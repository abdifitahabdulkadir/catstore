import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { RatingStars } from "@/components/rating-stars";
import { buttonVariants } from "@/components/ui/button";
import { getCategoryName, getProductById, PRODUCTS } from "@/lib/products";

export function generateStaticParams() {
  return PRODUCTS.map((product) => ({ id: String(product.id) }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = getProductById(Number(id));

  if (!product) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/" className={buttonVariants({ variant: "outline", className: "self-start" })}>
        <ArrowLeft />
        Back to products
      </Link>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4">
          <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {getCategoryName(product.category)}
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <RatingStars rating={product.rating} />
          <p className="text-base text-muted-foreground">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
