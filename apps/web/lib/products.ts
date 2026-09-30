export type Category = {
  slug: string;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  image: string | null;
  score?: number;
  rank?: number;
  matched?: { name: string[]; description: string[] };
};

export const CATEGORIES: Category[] = [
  { slug: "electronics", name: "Electronics" },
  { slug: "clothing", name: "Clothing" },
  { slug: "home-kitchen", name: "Home & Kitchen" },
  { slug: "books", name: "Books" },
  { slug: "sports-outdoors", name: "Sports & Outdoors" },
  { slug: "beauty", name: "Beauty" },
  { slug: "toys-games", name: "Toys & Games" },
  { slug: "automotive", name: "Automotive" },
  { slug: "jewelry", name: "Jewelry" },
  { slug: "grocery", name: "Grocery" },
];

export function getCategoryName(slug: string): string {
  return CATEGORIES.find((category) => category.slug === slug)?.name ?? slug;
}
