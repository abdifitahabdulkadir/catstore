import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Client } from '@elastic/elasticsearch';
import { ELASTIC_CLIENT } from '../elasticsearch/elasticsearch.module.js';

export const PAGE_SIZE = 25;
const INDEX = process.env.ELASTICSEARCH_INDEX ?? 'products';
// Elasticsearch's default index.max_result_window is 10,000 results (from + size).
const MAX_SEARCH_PAGES = 10_000 / PAGE_SIZE;

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

export type ProductPage = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ProductsService {
  constructor(@Inject(ELASTIC_CLIENT) private readonly es: Client) {}

  private query(q?: string, category?: string) {
    const filter: object[] = category ? [{ term: { category } }] : [];
    const must: object[] = q
      ? [{ multi_match: { query: q, fields: ['name^3', 'description'] } }]
      : [];
    return { bool: { must, filter } };
  }

  async count(q?: string, category?: string): Promise<number> {
    const { count } = await this.es.count({ index: INDEX, query: this.query(q, category) });
    return count;
  }

  // Pages are fetched in O(1) wherever possible, because Elasticsearch caps from/size
  // paging at 10,000 results:
  //  - no filters:      range on the contiguous `id`
  //  - category only:   range on `categoryRank` (position within the category)
  //  - text search:     relevance from/size, limited to the result window
  async findHits(page: number, q?: string, category?: string): Promise<Product[]> {
    const query = this.query(q, category);
    const start = (page - 1) * PAGE_SIZE;
    let from = 0;
    let sortField: string | null = null;

    if (q) {
      if (page > MAX_SEARCH_PAGES) {
        throw new BadRequestException(`Search results only go up to page ${MAX_SEARCH_PAGES}; refine your query.`);
      }
      from = start;
    } else {
      sortField = category ? 'categoryRank' : 'id';
      query.bool.filter.push({ range: { [sortField]: { gt: start, lte: start + PAGE_SIZE } } });
    }

    const res = await this.es.search<Product>({
      index: INDEX,
      from,
      size: PAGE_SIZE,
      track_total_hits: false,
      _source: { excludes: ['categoryRank'] },
      query,
      sort: sortField ? [{ [sortField]: 'asc' }] : ['_score', { id: 'asc' }],
    });
    return res.hits.hits.map((h) => h._source as Product);
  }

  // Text searches are ranked by relevance, so pages past the result window are cut off.
  totalPages(total: number, q?: string): number {
    const pages = Math.ceil(total / PAGE_SIZE);
    return q ? Math.min(pages, MAX_SEARCH_PAGES) : pages;
  }

  async findPage(page: number, q?: string, category?: string): Promise<ProductPage> {
    const [total, items] = await Promise.all([
      this.count(q, category),
      this.findHits(page, q, category),
    ]);
    return { items, page, pageSize: PAGE_SIZE, total, totalPages: this.totalPages(total, q) };
  }

  async findOne(id: number): Promise<Product | null> {
    const res = await this.es.get<Product>({ index: INDEX, id: String(id), _source_excludes: ['categoryRank'] }, { ignore: [404] });
    return res.found ? (res._source as Product) : null;
  }
}
