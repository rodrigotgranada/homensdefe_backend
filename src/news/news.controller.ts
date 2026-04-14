import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // GET /news           → global news
  // GET /news?cityId=xx → city news
  @Get()
  async findAll(@Query('cityId') cityId?: string) {
    if (cityId) return this.newsService.findByCity(cityId);
    return this.newsService.findGlobal();
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    return this.newsService.findBySlug(slug);
  }
}
