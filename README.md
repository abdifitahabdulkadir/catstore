# Catstore

A product search demo: a Next.js frontend (`apps/web`) and a NestJS API (`apps/api`) backed by Elasticsearch, with a key on the page showing how Elasticsearch scores results.

## Requirements

- Node.js 20+
- pnpm 10 (`corepack enable`)
- Docker (for Elasticsearch, which needs about 2 GB of RAM)

## Run it

Run these from the repo root, in this order.

**1. Install dependencies**

```bash
pnpm install
```

**2. Start Elasticsearch** (port 9200, password `admin`)

```bash
cd apps/api
docker compose up -d elasticsearch
```

**3. Seed products** (still in `apps/api`; wait ~30 seconds after step 2 for Elasticsearch to start)

```bash
pnpm seed:elastic 100000
```

The number is how many products to create. Without it, 5 million are created, which takes a long time. Running it again deletes and recreates the `products` index.

**4. Start the API** (http://localhost:3000)

```bash
cd ../..
pnpm api
```

**5. Start the web app** (http://localhost:301), in a second terminal at the repo root

```bash
pnpm web
```

Open http://localhost:301.

## Other commands

```bash
pnpm build    # build both apps
pnpm start    # run the built apps (build first)
pnpm lint     # lint both apps
```

## Configuration (optional)

Everything has a default that works with the steps above.

- API (`apps/api`), environment variables: `PORT`, `WEB_ORIGIN`, `PAGE_SIZE`, `ELASTICSEARCH_URL`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`, `ELASTICSEARCH_INDEX`. See `apps/api/src/config.ts` for all of them.
- Web (`apps/web`): `NEXT_PUBLIC_API_URL` (default `http://localhost:3000`).
