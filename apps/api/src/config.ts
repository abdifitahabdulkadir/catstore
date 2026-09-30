import { z } from 'zod';

const int = (fallback: number) => z.coerce.number().int().positive().default(fallback);

// Single home for tunable defaults. Every value can be overridden through an env var,
// and a bad value stops the app at startup instead of failing later at request time.
const env = z
  .object({
    PORT: int(3000),
    WEB_ORIGIN: z.url().default('http://localhost:301'),
    DEFAULT_PAGE: int(1),
    PAGE_SIZE: int(25),
    MAX_PAGE_SIZE: int(100),
    MAX_SEARCH_LENGTH: int(100),
    // Elasticsearch's default index.max_result_window is 10,000 results (from + size).
    MAX_RESULT_WINDOW: int(10_000),
    RATE_LIMIT_TTL_MS: int(1000),
    RATE_LIMIT: int(50),
    ELASTICSEARCH_URL: z.url().default('http://localhost:9200'),
    ELASTICSEARCH_USERNAME: z.string().min(1).default('elastic'),
    ELASTICSEARCH_PASSWORD: z.string().min(1).default('admin'),
    ELASTICSEARCH_INDEX: z.string().min(1).default('products'),
  })
  .refine((e) => e.PAGE_SIZE <= e.MAX_PAGE_SIZE && e.MAX_PAGE_SIZE <= e.MAX_RESULT_WINDOW, {
    message: 'PAGE_SIZE <= MAX_PAGE_SIZE <= MAX_RESULT_WINDOW must hold',
    path: ['PAGE_SIZE'],
  });

const parsed = env.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
}
const e = parsed.data;

export const config = {
  port: e.PORT,
  webOrigin: e.WEB_ORIGIN,
  defaultPage: e.DEFAULT_PAGE,
  pageSize: e.PAGE_SIZE,
  maxPageSize: e.MAX_PAGE_SIZE,
  maxSearchLength: e.MAX_SEARCH_LENGTH,
  maxResultWindow: e.MAX_RESULT_WINDOW,
  rateLimit: { ttl: e.RATE_LIMIT_TTL_MS, limit: e.RATE_LIMIT },
  elasticsearch: {
    node: e.ELASTICSEARCH_URL,
    username: e.ELASTICSEARCH_USERNAME,
    password: e.ELASTICSEARCH_PASSWORD,
    index: e.ELASTICSEARCH_INDEX,
  },
};
