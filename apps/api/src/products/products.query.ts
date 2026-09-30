import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { config } from '../config.js';

// Rejects malformed requests before they reach Elasticsearch. Unknown params are errors too,
// so a mistyped URL fails loudly instead of silently running an unfiltered search.
// `page` and `limit` are optional and never rejected: a missing, invalid or out-of-range
// value falls back to the default (page is raised to DEFAULT_PAGE, limit reset to PAGE_SIZE).
const listQuery = z.strictObject({
  page: z.coerce.number().int().catch(config.defaultPage).transform((n) => Math.max(n, config.defaultPage)),
  limit: z.coerce.number().int().min(1).max(config.maxPageSize).catch(config.pageSize),
  q: z.string().trim().max(config.maxSearchLength).optional(),
  category: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(50).optional(),
});

export type ListQuery = z.infer<typeof listQuery>;

export function parseListQuery(query: unknown): ListQuery {
  const result = listQuery.safeParse(query);
  if (!result.success) throw new BadRequestException(z.prettifyError(result.error));
  return { ...result.data, q: result.data.q || undefined };
}
