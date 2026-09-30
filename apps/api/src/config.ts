// Single home for tunable defaults. Every value can be overridden through an env var.
const int = (name: string, fallback: number) => Number(process.env[name]) || fallback;

export const config = {
  port: int('PORT', 3000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:301',
  defaultPage: int('DEFAULT_PAGE', 1),
  pageSize: int('PAGE_SIZE', 25),
  maxSearchLength: int('MAX_SEARCH_LENGTH', 100),
  // Elasticsearch's default index.max_result_window is 10,000 results (from + size).
  maxResultWindow: int('MAX_RESULT_WINDOW', 10_000),
  rateLimit: { ttl: int('RATE_LIMIT_TTL_MS', 1000), limit: int('RATE_LIMIT', 50) },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
    username: process.env.ELASTICSEARCH_USERNAME ?? 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD ?? 'admin',
    index: process.env.ELASTICSEARCH_INDEX ?? 'products',
  },
};
