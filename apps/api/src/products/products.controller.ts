import { Controller, Get, NotFoundException, Param, ParseIntPipe, Query } from '@nestjs/common';
import { parseListQuery } from './products.query.js';
import { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) { }

  // GET /products?page=1&limit=25&q=wireless&category=electronics (all optional)
  @Get()
  getProducts(@Query() query: Record<string, unknown>) {
    const { page, limit, q, category } = parseListQuery(query);
    return this.products.getProducts(page, limit, q, category);
  }

  @Get(':id')
  async getProductDetail(@Param('id', ParseIntPipe) id: number) {
    const product = await this.products.getProductDetail(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }
}
