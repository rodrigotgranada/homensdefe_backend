import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ required: true })
  action: string; // e.g., 'USER_UPDATE', 'PASSWORD_RESET', 'STATUS_CHANGE'

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  targetUser: Types.ObjectId;

  @Prop({ type: Object })
  details: any; // e.g., { oldEmail: '...', newEmail: '...' }
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
