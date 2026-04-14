import { Controller, Get, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(@Query('cityId') cityId?: string) {
    if (cityId) return this.eventsService.findByCity(cityId);
    return this.eventsService.findGlobal();
  }
}
