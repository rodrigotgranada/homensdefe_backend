import { Controller, Get, Param } from '@nestjs/common';
import { CitiesService } from './cities.service';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  async getActiveCities() {
    return this.citiesService.findAllActive();
  }

  @Get(':slug')
  async getCityBySlug(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug);
  }
}
