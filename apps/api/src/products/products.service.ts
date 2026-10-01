import { BadRequestException, Injectable } from '@nestjs/common';
import { config } from '../config.js';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service.js';

const INDEX = config.elasticsearch.index;

export type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  tags: string[];
  price: number;
  rating: number;
  image: string | null;
};

export type ProductHit = Product & {
  score?: number;
  rank?: number;
  matched?: { name: string[]; description: string[] };
};

export type ProductPage = {
  items: ProductHit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  tookMs: number;
};

@Injectable()
export class ProductsService {
  constructor(private readonly es: ElasticsearchService) { }

  // Builds one Elasticsearch query (text search + category filter) and uses it for both the total count and the page of results.
  async getProducts(page: number, limit: number, q?: string, category?: string): Promise<ProductPage> {
    const startedAt = performance.now();
    const start = (page - 1) * limit;
    const maxPages = Math.floor(config.maxResultWindow / limit);

    if (q && page > maxPages) {
      throw new BadRequestException(`Search results only go up to page ${maxPages}; refine your query.`);
    }

    const must: object[] = q ? [{ multi_match: { query: q, fields: ['name^3', 'description'] } }] : [];
    const filter: object[] = category ? [{ term: { category } }] : [];

    const sortField = category ? 'categoryRank' : 'id';
    const pageFilter = q ? filter : [...filter, { range: { [sortField]: { gt: start, lte: start + limit } } }];

    const [counted, res] = await Promise.all([
      this.es.count({ index: INDEX, query: { bool: { must, filter } } }),
      this.es.search<Product>({
        index: INDEX,
        from: q ? start : 0,
        size: limit,
        track_total_hits: false,
        _source: { excludes: ['categoryRank'] },
        query: { bool: { must, filter: pageFilter } },
        highlight: q
          ? { pre_tags: ['<em>'], post_tags: ['</em>'], fields: { name: { number_of_fragments: 0 }, description: { number_of_fragments: 0 } } }
          : undefined,
        sort: q ? ['_score', { id: 'asc' }] : [{ [sortField]: 'asc' }],
      }),
    ]);

    const items: ProductHit[] = res.hits.hits.map((h, i) => {
      const product = h._source as Product;
      if (!q) return product;
      return {
        ...product,
        score: h._score ?? undefined,
        rank: start + i + 1,
        matched: {
          name: [...new Set((h.highlight?.name ?? []).flatMap((f) => [...f.matchAll(/<em>(.*?)<\/em>/g)].map((m) => m[1].toLowerCase())))],
          description: [...new Set((h.highlight?.description ?? []).flatMap((f) => [...f.matchAll(/<em>(.*?)<\/em>/g)].map((m) => m[1].toLowerCase())))],
        },
      };
    });

    const pages = Math.ceil(counted.count / limit);
    return {
      items,
      page,
      pageSize: limit,
      total: counted.count,
      totalPages: q ? Math.min(pages, maxPages) : pages,
      tookMs: Math.round(performance.now() - startedAt),
    };
  }

  async getProductDetail(id: number): Promise<Product | null> {
    const res = await this.es.get<Product>({ index: INDEX, id: String(id), _source_excludes: ['categoryRank'] }, { ignore: [404] });
    return res.found ? (res._source as Product) : null;
  }
}
