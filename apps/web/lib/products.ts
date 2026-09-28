export type Category = {
  slug: string;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  image: string;
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

const PRODUCT_NOUNS: Record<string, string[]> = {
  electronics: ["Wireless Headphones", "Smart Watch", "Bluetooth Speaker", "4K Monitor", "Mechanical Keyboard", "USB-C Hub", "Action Camera", "Power Bank", "Wireless Mouse", "Smart Home Hub"],
  clothing: ["Denim Jacket", "Running Shoes", "Cotton T-Shirt", "Wool Sweater", "Leather Belt", "Rain Jacket", "Chino Pants", "Summer Dress", "Hiking Boots", "Baseball Cap"],
  "home-kitchen": ["Stand Mixer", "Air Fryer", "Cast Iron Skillet", "Coffee Maker", "Knife Set", "Bedding Set", "Throw Pillow", "Ceramic Vase", "Dish Rack", "Cutting Board"],
  books: ["Mystery Novel", "Cookbook", "Sci-Fi Anthology", "History Guide", "Poetry Collection", "Biography", "Travel Journal", "Graphic Novel", "Self-Help Guide", "Children's Storybook"],
  "sports-outdoors": ["Yoga Mat", "Camping Tent", "Water Bottle", "Trekking Poles", "Resistance Bands", "Bike Helmet", "Sleeping Bag", "Fishing Rod", "Basketball", "Dumbbell Set"],
  beauty: ["Facial Serum", "Moisturizer", "Lipstick Set", "Hair Dryer", "Perfume", "Makeup Brush Set", "Sunscreen", "Shampoo Bar", "Nail Polish Kit", "Body Lotion"],
  "toys-games": ["Board Game", "Building Blocks", "Puzzle Set", "Remote Control Car", "Plush Toy", "Card Game", "Action Figure", "Art Supplies Kit", "Model Kit", "Toy Drone"],
  automotive: ["Car Vacuum", "Dash Cam", "Tire Inflator", "Phone Mount", "Seat Cover Set", "Jump Starter", "Floor Mats", "Car Wax Kit", "LED Headlights", "Roof Cargo Bag"],
  jewelry: ["Silver Necklace", "Gold Earrings", "Charm Bracelet", "Pearl Ring", "Cufflinks Set", "Pendant Chain", "Gemstone Brooch", "Anklet", "Wedding Band", "Watch Bracelet"],
  grocery: ["Organic Coffee", "Olive Oil", "Trail Mix", "Herbal Tea", "Dark Chocolate", "Granola Bars", "Honey Jar", "Pasta Set", "Spice Collection", "Sparkling Water Pack"],
};

const DESCRIPTIONS = [
  "Built for everyday use with a focus on comfort and durability.",
  "A customer favorite thanks to its reliable performance and value.",
  "Designed with quality materials that stand the test of time.",
  "Combines modern style with practical, everyday functionality.",
  "Lightweight, well-made, and ready for daily use.",
  "Crafted with attention to detail for a premium feel.",
  "An easy addition to your routine, backed by great reviews.",
  "Made to perform well without breaking the bank.",
];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const random = seededRandom(42);

function buildProducts(): Product[] {
  const products: Product[] = [];
  let id = 1;

  for (const category of CATEGORIES) {
    const nouns = PRODUCT_NOUNS[category.slug] ?? [];
    for (const noun of nouns) {
      const price = Math.round((10 + random() * 190) * 100) / 100;
      const rating = Math.round((3 + random() * 2) * 10) / 10;
      const description = DESCRIPTIONS[Math.floor(random() * DESCRIPTIONS.length)];

      products.push({
        id: id++,
        name: noun,
        description,
        category: category.slug,
        price,
        rating,
        image: "/product-placeholder.svg",
      });
    }
  }

  return products;
}

export const PRODUCTS: Product[] = buildProducts();

export const PAGE_SIZE = 30;
