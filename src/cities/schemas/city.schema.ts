import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CityDocument = City & Document;

export enum CityStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
}

@Schema({ timestamps: true })
export class City {
  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  uf: string;

  @Prop({ enum: CityStatus, default: CityStatus.PENDING })
  status: CityStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  adminLocalRefs: Types.ObjectId[];

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  quemSomosLocal: string;

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;
}

export const CitySchema = SchemaFactory.createForClass(City);
