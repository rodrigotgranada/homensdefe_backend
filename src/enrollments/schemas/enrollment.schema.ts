import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EnrollmentDocument = Enrollment & Document;

export enum EnrollmentStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Enrollment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userRef: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventRef: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'City', required: true })
  cityRef: Types.ObjectId;

  @Prop({ enum: EnrollmentStatus, default: EnrollmentStatus.ACTIVE })
  status: EnrollmentStatus;

  @Prop({ default: false })
  attended: boolean;

  @Prop()
  cancelledReason: string;
}

export const EnrollmentSchema = SchemaFactory.createForClass(Enrollment);
