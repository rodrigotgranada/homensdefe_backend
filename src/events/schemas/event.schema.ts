import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event {
  @Prop({ type: Types.ObjectId, ref: 'City', default: null })
  cityRef: Types.ObjectId;

  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  data: Date;

  @Prop({ required: true })
  local: string;

  @Prop({ required: true })
  descricao: string;

  @Prop({ required: true })
  limiteVagas: number;

  @Prop({ type: [String], default: [] })
  fotos: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);
