import { Controller, Get, Param, Request, UseGuards, NotFoundException } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Get()
  async getActiveCities() {
    return this.citiesService.findAllActive();
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-city')
  async getMyCity(@Request() req) {
    if (!req.user.cidadeAdmin) {
      throw new NotFoundException('Usuário não possui cidade vinculada como administrador.');
    }
    return this.citiesService.findById(req.user.cidadeAdmin);
  }

  @Get(':slug')
  async getCityBySlug(@Param('slug') slug: string) {
    return this.citiesService.findBySlug(slug);
  }
}
