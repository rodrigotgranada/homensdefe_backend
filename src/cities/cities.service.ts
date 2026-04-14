import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { City, CityDocument, CityStatus } from './schemas/city.schema';

@Injectable()
export class CitiesService {
  constructor(@InjectModel(City.name) private cityModel: Model<CityDocument>) {}

  async findAllActive() {
    return this.cityModel.find({ status: CityStatus.ACTIVE }).exec();
  }

  async findBySlug(slug: string) {
    return this.cityModel.findOne({ slug, status: CityStatus.ACTIVE }).exec();
  }

  async findByAdminId(adminId: string) {
    return this.cityModel.findOne({
      adminLocalRefs: new Types.ObjectId(adminId),
      status: CityStatus.ACTIVE,
    }).exec();
  }
}
