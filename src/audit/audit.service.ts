import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  async log(action: string, performedBy: string, targetUser: string, details?: any) {
    const log = new this.auditModel({
      action,
      performedBy: new Types.ObjectId(performedBy),
      targetUser: new Types.ObjectId(targetUser),
      details,
    });
    return log.save();
  }

  async findByTarget(targetId: string) {
    return this.auditModel.find({ targetUser: new Types.ObjectId(targetId) })
      .populate('performedBy', 'nome sobrenome email')
      .sort({ timestamp: -1 })
      .exec();
  }
}
