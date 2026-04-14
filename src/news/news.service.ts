import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { News, NewsDocument } from './schemas/news.schema';

@Injectable()
export class NewsService {
  constructor(@InjectModel(News.name) private newsModel: Model<NewsDocument>) {}

  async findGlobal() {
    return this.newsModel.find({ cityRef: null }).sort({ createdAt: -1 }).exec();
  }

  async findByCity(cityId: string) {
    return this.newsModel.find({ cityRef: new Types.ObjectId(cityId) }).sort({ createdAt: -1 }).exec();
  }

  async findBySlug(slug: string) {
    return this.newsModel.findOne({ slug }).exec();
  }
}
