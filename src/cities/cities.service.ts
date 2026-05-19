import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { City, CityDocument, CityStatus } from './schemas/city.schema';

@Injectable()
export class CitiesService implements OnModuleInit {
  private readonly logger = new Logger(CitiesService.name);
  constructor(@InjectModel(City.name) private cityModel: Model<CityDocument>) {}

  async onModuleInit() {
    const count = await this.cityModel.countDocuments({ status: CityStatus.ACTIVE }).exec();
    this.logger.log(`Cidades ativas encontradas no banco: ${count}`);
    if (count === 0) {
      this.logger.warn('Nenhuma cidade ativa encontrada! Verifique se os documentos no MongoDB possuem status: "ACTIVE"');
    }
  }

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

  async findById(id: string) {
    return this.cityModel.findById(id).exec();
  }
}
