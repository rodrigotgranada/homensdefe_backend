import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NewsDocument = News & Document;

@Schema({ timestamps: true })
export class News {
  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  conteudo: string;

  @Prop()
  fotoUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'City', default: null })
  cityRef: Types.ObjectId; // Se for nulo, é uma notícia Global.

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;
}

export const NewsSchema = SchemaFactory.createForClass(News);
