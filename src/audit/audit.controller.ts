import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, User } from '../users/schemas/user.schema';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    @InjectModel(User.name) private userModel: Model<User>
  ) {}

  @Get('target/:idOrMatricula')
  async getLogsByTarget(@Param('idOrMatricula') idOrMatricula: string) {
    let targetId = idOrMatricula;

    // Se não for um ObjectId válido, assumimos que é uma matrícula e buscamos o ID real
    if (!Types.ObjectId.isValid(idOrMatricula)) {
      const user = await this.userModel.findOne({ matricula: idOrMatricula }).select('_id').exec();
      if (!user) throw new NotFoundException('Usuário não encontrado para auditoria.');
      targetId = String(user._id);
    }

    return this.auditService.findByTarget(targetId);
  }
}
