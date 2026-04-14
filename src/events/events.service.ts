import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';

@Injectable()
export class EventsService {
  constructor(@InjectModel(Event.name) private eventModel: Model<EventDocument>) {}

  async findGlobal() {
    return this.eventModel.find({ cityRef: null, isActive: true }).sort({ data: 1 }).exec();
  }

  async findByCity(cityId: string) {
    return this.eventModel.find({ cityRef: new Types.ObjectId(cityId), isActive: true }).sort({ data: 1 }).exec();
  }
}
