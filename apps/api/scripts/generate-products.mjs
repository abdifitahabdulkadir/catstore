// Generates a large, deterministic set of unique products into
// apps/api/src/data/products.json (gitignored — regenerate with `pnpm generate:products`).
//
// Uniqueness is not achieved by appending an incrementing number to titles/descriptions.
// Instead, each product's text is assembled from several word banks, and the specific
// combination picked for product `i` within a block comes from a multiplicative bijection
// (i * M) mod N over the full combination space N (N is far larger than the number of
// products drawn from it). Because the mapping is injective, every index in range produces
// a distinct combination — collisions are impossible by construction, not by luck.

import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "data");
// NDJSON (one JSON object per line), not a single JSON array: at 5M+ rows the file
// is well over a gigabyte, past the size a single JSON.parse can ever handle in Node
// (V8 caps string length around ~536M characters). NDJSON is read back in bounded
// chunks instead of as one giant string — see src/data/products.ts.
const OUT_FILE = join(OUT_DIR, "products.ndjson");

const TOTAL_PRODUCTS = Number(process.argv[2] ?? 5_000_000);

const CATEGORIES = [
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

const PRODUCT_NOUNS = {
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

// --- word banks (kept as flat lists deliberately, so bank sizes are easy to reason about) ---

const ADJECTIVES = [
  "Premium", "Compact", "Rugged", "Sleek", "Advanced", "Classic", "Modern", "Portable", "Deluxe", "Eco-Friendly",
  "Heavy-Duty", "Ultra-Light", "Professional", "Everyday", "Signature", "Essential", "Refined", "Bold", "Minimalist", "Versatile",
  "Smart", "Durable", "Elegant", "Sporty", "Vintage-Inspired", "Next-Gen", "All-Purpose", "High-Performance", "Streamlined", "Timeless",
  "Effortless", "Reliable", "Innovative", "Understated", "Handcrafted", "Artisan", "Contemporary", "Weatherproof", "Travel-Ready", "Studio-Grade",
  "Precision-Built", "Feather-Light", "Chic", "Polished", "Iconic", "Practical", "Adaptive", "Dependable", "Distinctive", "Robust",
  "Sturdy", "Sophisticated", "Nimble", "Cutting-Edge", "Time-Tested", "Comfort-First", "Trail-Ready", "Everyday-Tough", "Refined-Edge", "Field-Tested",
]; // 60

const MATERIALS = [
  "Titanium", "Stainless Steel", "Organic Cotton", "Bamboo", "Recycled Aluminum", "Genuine Leather", "Carbon Fiber", "Memory Foam", "Silicone", "Merino Wool",
  "Brushed Nickel", "Walnut Wood", "Oak Wood", "Tempered Glass", "Ceramic", "Ripstop Nylon", "Canvas", "Cork", "Recycled Plastic", "Anodized Aluminum",
  "Sterling Silver", "14K Gold", "Rose Gold", "Cast Iron", "Copper", "Bronze", "Polyester Blend", "Linen", "Suede", "Velvet",
  "Mesh Fabric", "High-Density Foam", "Bamboo Fiber", "Stoneware", "Porcelain", "Acacia Wood", "Rubber", "Neoprene", "Chrome", "Matte Vinyl",
  "Faux Leather", "Brass", "Wicker", "Terracotta", "Marble", "Granite", "Birchwood", "Tungsten", "Platinum-Plated", "Vegan Leather",
]; // 50

const COLORS = [
  "Matte Black", "Ocean Blue", "Sandstone", "Graphite Gray", "Ivory White", "Forest Green", "Rose Gold", "Slate Gray", "Charcoal", "Crimson Red",
  "Sunset Orange", "Deep Navy", "Blush Pink", "Olive Green", "Burgundy", "Champagne", "Steel Blue", "Pearl White", "Espresso Brown", "Mint Green",
  "Lavender", "Mustard Yellow", "Teal", "Coral", "Storm Gray", "Midnight Blue", "Copper Tone", "Cream", "Onyx Black", "Sky Blue",
  "Sage Green", "Terracotta Red", "Plum", "Amber", "Silver", "Bronze Tone", "Natural Wood", "Two-Tone", "Frosted Clear", "Jet Black",
]; // 40

const VARIANTS = [
  "Pro", "Max", "Lite", "Plus", "Series II", "Limited Edition", "Everyday Edition", "Travel Edition", "Home Edition", "Studio Edition",
  "Series X", "Mark II", "2nd Generation", "Anniversary Edition", "Essentials", "Signature Series", "Classic Edition", "Sport Edition", "Deluxe Edition", "Compact Edition",
  "Family Pack", "Value Pack", "Premium Set", "Starter Kit", "Pro Kit", "All-in-One", "Explorer Edition", "Urban Edition", "Outdoor Edition", "Weekend Edition",
  "Everyday Set", "Travel Kit", "Home Set", "Studio Set", "Collector's Edition", "Heritage Edition", "Modern Edition", "Active Edition", "Comfort Edition", "Essential Kit",
]; // 40

const FEATURES = [
  "Wireless", "Fast-Charging", "Water-Resistant", "Foldable", "Adjustable", "Ergonomic", "Insulated", "Reinforced", "Anti-Slip", "Noise-Cancelling",
  "Breathable", "Stain-Resistant", "Quick-Dry", "Shockproof", "Rechargeable", "Touch-Enabled", "Voice-Activated", "Energy-Efficient", "Non-Slip", "Scratch-Resistant",
  "Odor-Resistant", "UV-Protective", "Machine-Washable", "Tool-Free", "One-Touch", "Multi-Purpose", "Space-Saving", "Cordless", "Impact-Resistant", "Temperature-Controlled",
  "Leak-Proof", "Fold-Flat", "Stackable", "Quick-Release", "Low-Maintenance", "Long-Lasting", "All-Weather", "Anti-Fog", "Anti-Static", "Dishwasher-Safe",
  "Freezer-Safe", "Airtight", "Rustproof", "Windproof", "Puncture-Resistant", "Slip-Resistant", "Reflective", "Magnetic", "Interlocking", "Expandable",
  "Reversible", "Wrinkle-Resistant", "Hypoallergenic", "Fade-Resistant", "Non-Toxic", "Self-Cleaning", "Quick-Install", "Travel-Friendly", "Glare-Free", "Dust-Resistant",
]; // 60

const BENEFITS = [
  "all-day comfort", "reliable performance", "effortless setup", "long-term durability", "a premium feel", "consistent results", "peace of mind", "a noticeable upgrade",
  "smooth everyday use", "dependable quality", "a seamless experience", "lasting value", "a professional finish", "worry-free maintenance", "steady performance", "a comfortable fit",
  "reliable protection", "a modern upgrade", "hassle-free use", "a confident feel", "trouble-free operation", "consistent quality", "a refined touch", "everyday convenience",
  "long-lasting reliability", "a satisfying upgrade", "practical convenience", "a dependable feel", "everyday resilience", "a polished result", "steady, repeatable results", "a well-built feel",
  "genuine peace of mind", "consistent, dependable use", "a durable, lasting fit", "smooth, reliable operation", "a comfortable, secure fit", "effortless daily use", "solid everyday performance", "a trustworthy upgrade",
]; // 40

const USE_CASES = [
  "daily use", "weekend trips", "the home office", "active lifestyles", "small spaces", "busy households", "everyday errands", "outdoor adventures",
  "the modern kitchen", "travel and commuting", "family life", "casual weekends", "work and play", "everyday routines", "on-the-go living", "home and away",
  "first-time buyers", "seasoned enthusiasts", "gift-giving", "everyday comfort", "practical everyday needs", "modern living", "busy schedules", "year-round use",
  "indoor and outdoor use", "the whole family", "students and professionals", "hobbyists and beginners", "long days and late nights", "every room in the house",
]; // 30

// Bookend sentences: these don't need to carry the uniqueness guarantee (the two
// sentences built from ADJECTIVES/FEATURES/MATERIALS/BENEFITS/USE_CASES already do
// that), they just pad the description out to a full paragraph.
const INTROS = [
  "Whether you're upgrading your everyday routine or trying something new, this one stands out.",
  "Built for people who care about the details, it's an easy addition to any collection.",
  "From the first use, it's clear this was made with real care.",
  "A dependable addition to any lineup, ready for whatever the day brings.",
  "Designed with the end user in mind, it earns its place in daily rotation.",
  "This is the kind of piece that quietly becomes a favorite.",
  "Made for people who notice quality, it doesn't cut corners.",
  "It's the sort of product that makes a routine feel a little easier.",
  "Thoughtfully put together, it's built to be used, not just admired.",
  "A small upgrade that makes a noticeable difference day to day.",
  "It fits right into a busy life without asking much in return.",
  "Made to be lived with, not just looked at.",
  "This is a practical pick for anyone who wants quality without the fuss.",
  "It's built around one idea: make everyday moments a little better.",
  "A straightforward, well-considered option for people who know what they want.",
  "It was designed to earn a permanent spot in your everyday lineup.",
  "For anyone comparing options, this one holds up to close inspection.",
  "It's the kind of purchase that pays off the more you use it.",
  "Simple on the surface, but there's real thought behind the design.",
  "It's built to handle real life, not just look good in a photo.",
  "A dependable pick that's easy to recommend to friends and family.",
  "It was made to feel just as good on day 300 as it does on day one.",
  "This one was designed around how people actually use it, not just how it looks.",
  "It's a low-effort way to raise the bar on something you use often.",
  "Made with a clear point of view, it doesn't try to be everything at once.",
  "It's an easy yes for anyone who's tired of settling for average.",
  "A considered choice for people who'd rather buy once and buy well.",
  "It was built to fit naturally into whatever routine it joins.",
  "This is what happens when practical design meets everyday needs.",
  "It's meant to be the reliable option you reach for without thinking twice.",
  "Small details add up here, and it shows in daily use.",
  "It's built for people who'd rather have something that works than something flashy.",
  "A grounded, no-nonsense option that still feels a little special.",
  "It was designed to disappear into your routine in the best way.",
  "This one rewards a closer look.",
]; // 35

const CLOSINGS = [
  "Backed by consistently positive feedback from everyday users.",
  "A dependable pick for anyone who values quality over hype.",
  "Whether it's a first purchase or a repeat favorite, it delivers.",
  "Simple, functional, and built to last through daily use.",
  "It's the kind of purchase people end up recommending unprompted.",
  "A solid choice that holds its own against pricier alternatives.",
  "It consistently earns repeat purchases for a reason.",
  "An easy recommendation for anyone on the fence.",
  "It tends to outlast expectations, in the best way.",
  "A reliable option that rarely disappoints.",
  "It's built to be a long-term favorite, not a one-time buy.",
  "Consistently rated as a dependable, everyday essential.",
  "It holds up well to regular, real-world use.",
  "A trustworthy pick that's easy to live with.",
  "It's the kind of item that quietly earns its keep.",
  "Reliable enough to become a repeat purchase.",
  "It delivers on the basics without overcomplicating things.",
  "A steady performer that rarely needs a second thought.",
  "It's built to keep working long after the novelty wears off.",
  "An easy addition to a growing list of everyday favorites.",
  "It's the sort of thing you don't think about until it's not there.",
  "A dependable option that consistently gets the job done.",
  "It tends to become a fast favorite once it's in regular use.",
  "Well suited to daily use without losing its edge over time.",
  "It's built to be trusted, not just tried once.",
  "A practical choice that holds up to scrutiny.",
  "It's proven itself useful well beyond the first impression.",
  "A steady, no-surprises option for everyday needs.",
  "It earns its spot through consistent, reliable use.",
  "A quietly dependable pick that's easy to stand behind.",
  "It's built to satisfy, not just to sell.",
  "A grounded option that consistently meets expectations.",
  "It tends to become the default choice once it's been tried.",
  "A reliable everyday companion, nothing more, nothing less.",
  "It's the kind of product that earns trust over time.",
]; // 35

const CATEGORY_TAGS = {
  electronics: ["gadgets", "tech", "wireless-tech", "home-tech", "portable-tech", "audio", "smart-devices", "computer-accessories", "charging", "photography"],
  clothing: ["apparel", "everyday-wear", "outerwear", "footwear", "seasonal", "wardrobe-staple", "casual-wear", "activewear", "cold-weather", "warm-weather"],
  "home-kitchen": ["kitchenware", "home-essentials", "cookware", "small-appliance", "home-decor", "organization", "bedroom", "dining", "meal-prep", "tableware"],
  books: ["reading", "fiction", "non-fiction", "gift-worthy", "book-club-pick", "paperback-favorite", "collector-worthy", "series-starter", "bestselling-genre", "cover-to-cover"],
  "sports-outdoors": ["fitness", "outdoor-gear", "training", "adventure", "camping", "hydration", "recovery", "trail-ready", "workout-essential", "all-terrain"],
  beauty: ["skincare", "self-care", "haircare", "makeup", "daily-routine", "spa-worthy", "clean-beauty", "everyday-glow", "personal-care", "grooming"],
  "toys-games": ["playtime", "family-game-night", "kids-favorite", "creative-play", "collectible", "screen-free-fun", "party-ready", "STEM-friendly", "gift-for-kids", "hobby-build"],
  automotive: ["car-care", "road-trip-ready", "garage-essential", "commuter-friendly", "car-accessory", "roadside-ready", "detailing", "interior-upgrade", "all-season", "driver-favorite"],
  jewelry: ["accessories", "everyday-jewelry", "gift-worthy", "statement-piece", "fine-jewelry", "occasion-wear", "layering-piece", "heirloom-style", "gift-for-her", "gift-for-him"],
  grocery: ["pantry-staple", "snack-time", "everyday-grocery", "organic-pick", "gourmet", "quick-meal", "healthy-choice", "gift-basket-worthy", "breakfast-favorite", "stock-up"],
};

const GLOBAL_TAGS = [
  "bestseller", "new-arrival", "staff-pick", "top-rated", "limited-stock", "free-shipping", "eco-friendly", "gift-idea",
  "trending", "customer-favorite", "on-sale", "premium-pick", "fast-shipping", "most-wished-for", "editor-choice",
];

// --- deterministic PRNG + bijection helpers ---

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Picks an M coprime with n, so that (i * M) mod n is a bijection on [0, n).
function coprimeMultiplier(n, rng) {
  let m = Math.max(2, Math.floor(rng() * n));
  while (gcd(m, n) !== 1) {
    m += 1;
    if (m >= n) m = 2;
  }
  return m;
}

function decompose(index, sizes) {
  const idxs = new Array(sizes.length);
  let rem = index;
  for (let i = 0; i < sizes.length; i++) {
    idxs[i] = rem % sizes[i];
    rem = Math.floor(rem / sizes[i]);
  }
  return idxs;
}

// --- combination spaces ---

const NAME_SIZES = [ADJECTIVES.length, MATERIALS.length, COLORS.length, VARIANTS.length];
const NAME_SPACE = NAME_SIZES.reduce((a, b) => a * b, 1);

const DESC_SIZES = [ADJECTIVES.length, FEATURES.length, MATERIALS.length, BENEFITS.length, USE_CASES.length];
const DESC_SPACE = DESC_SIZES.reduce((a, b) => a * b, 1);

if (TOTAL_PRODUCTS >= DESC_SPACE) {
  throw new Error(`TOTAL_PRODUCTS (${TOTAL_PRODUCTS}) must stay below the description combination space (${DESC_SPACE}) to guarantee uniqueness.`);
}

const perCategory = Math.floor(TOTAL_PRODUCTS / CATEGORIES.length);

for (const category of CATEGORIES) {
  const nouns = PRODUCT_NOUNS[category.slug];
  const perNoun = Math.floor(perCategory / nouns.length);
  if (perNoun >= NAME_SPACE) {
    throw new Error(`perNoun (${perNoun}) for ${category.slug} exceeds the name combination space (${NAME_SPACE}).`);
  }
}

// Single global bijection for descriptions, keyed by the 0-indexed global product id,
// so descriptions are unique across the *entire* dataset, not just within a block.
const globalSeedRng = mulberry32(hashString("catstore-products-v1"));
const descM = coprimeMultiplier(DESC_SPACE, globalSeedRng);

mkdirSync(OUT_DIR, { recursive: true });
// A small highWaterMark plus explicit drain-waiting keeps writes flowing in modest,
// backpressure-respecting increments instead of letting ~5M records (multiple GB)
// queue up in memory before a single giant flush — the latter is what caused an
// ERR_SYSTEM_ERROR writev failure (and a corrupted, oversized output file) on this
// volume when the generation loop (fast, CPU-bound) outran the disk (slow, I/O-bound).
const stream = createWriteStream(OUT_FILE, { encoding: "utf-8", highWaterMark: 1 * 1024 * 1024 });

function writeAsync(chunk) {
  return new Promise((resolve, reject) => {
    stream.once("error", reject);
    const ok = stream.write(chunk, (err) => {
      stream.removeListener("error", reject);
      if (err) reject(err);
    });
    if (ok) resolve();
    else stream.once("drain", resolve);
  });
}

let written = 0;
let globalIndex = 0; // 0-indexed, drives the description bijection
let id = 0;

const priceRng = mulberry32(hashString("catstore-price-v1"));
const ratingRng = mulberry32(hashString("catstore-rating-v1"));
const introRng = mulberry32(hashString("catstore-intro-v1"));
const closingRng = mulberry32(hashString("catstore-closing-v1"));

const BATCH_SIZE = 2000;
let batch = [];

async function flushBatch() {
  if (batch.length === 0) return;
  await writeAsync(batch.join("\n") + "\n");
  written += batch.length;
  batch = [];
}

async function main() {
  for (const category of CATEGORIES) {
    const nouns = PRODUCT_NOUNS[category.slug];
    const perNoun = Math.floor(perCategory / nouns.length);
    const categoryTagPool = CATEGORY_TAGS[category.slug];

    for (const noun of nouns) {
      const blockKey = `${category.slug}::${noun}`;
      const blockRng = mulberry32(hashString(blockKey));
      const nameM = coprimeMultiplier(NAME_SPACE, blockRng);
      const tagRng = mulberry32(hashString(blockKey + "::tags"));

      for (let i = 0; i < perNoun; i++) {
        id += 1;

        const namePermIdx = (i * nameM) % NAME_SPACE;
        const [aIdx, mIdx, cIdx, vIdx] = decompose(namePermIdx, NAME_SIZES);
        const name = `${ADJECTIVES[aIdx]} ${MATERIALS[mIdx]} ${noun}, ${COLORS[cIdx]} ${VARIANTS[vIdx]}`;

        const descPermIdx = (globalIndex * descM) % DESC_SPACE;
        const [dAIdx, fIdx, dMIdx, bIdx, uIdx] = decompose(descPermIdx, DESC_SIZES);
        const intro = INTROS[Math.floor(introRng() * INTROS.length)];
        const closing = CLOSINGS[Math.floor(closingRng() * CLOSINGS.length)];
        const description =
          `${intro} ${ADJECTIVES[dAIdx]} craftsmanship meets ${FEATURES[fIdx]} function. ` +
          `Made with ${MATERIALS[dMIdx]}, it delivers ${BENEFITS[bIdx]} for ${USE_CASES[uIdx]}. ` +
          `${closing}`;

        const tags = [
          categoryTagPool[Math.floor(tagRng() * categoryTagPool.length)],
          GLOBAL_TAGS[Math.floor(tagRng() * GLOBAL_TAGS.length)],
          GLOBAL_TAGS[Math.floor(tagRng() * GLOBAL_TAGS.length)],
        ];

        const price = Math.round((10 + priceRng() * 490) * 100) / 100;
        const rating = Math.round((30 + ratingRng() * 20)) / 10;

        const record = {
          id,
          name,
          description,
          category: category.slug,
          tags,
          price,
          rating,
          image: null,
        };

        batch.push(JSON.stringify(record));
        if (batch.length >= BATCH_SIZE) await flushBatch();
        globalIndex += 1;
      }
    }
  }

  await flushBatch();
  await new Promise((resolve, reject) => {
    stream.end((err) => (err ? reject(err) : resolve()));
  });
  console.log(`Wrote ${written} products to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
