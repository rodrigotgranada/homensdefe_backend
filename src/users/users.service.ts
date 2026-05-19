import { Injectable, ConflictException, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserStatus } from './schemas/user.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    private mailService: MailService,
    private auditService: AuditService
  ) {}

  async generateNextMatricula(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2); // Ex: 24
    const counter = await this.counterModel.findOneAndUpdate(
      { name: 'user_matricula' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    
    // Formatar como HF240001 (HF + Ano + Sequência de 4 dígitos)
    const sequence = counter.seq.toString().padStart(4, '0');
    return `HF${year}${sequence}`;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findByCpf(cpf: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ cpf }).exec();
  }

  async checkAvailability(email?: string, cpf?: string, phone?: string) {
    const result = { emailAvailable: true, cpfAvailable: true, phoneAvailable: true };
    if (email) {
      const user = await this.findByEmail(email);
      result.emailAvailable = !user;
    }
    if (cpf) {
      const user = await this.findByCpf(cpf);
      result.cpfAvailable = !user;
    }
    if (phone) {
      // Remover máscara para busca (apenas números)
      const cleanPhone = phone.replace(/\D/g, '');
      const user = await this.userModel.findOne({ 
        'telefones.numero': { $regex: cleanPhone } 
      }).exec();
      result.phoneAvailable = !user;
    }
    return result;
  }

  /** Bypasses the pre-findOne hook that hides EXCLUDED users — use only for auth flows (reactivation, password reset). */
  async findByEmailIncludingExcluded(email: string): Promise<UserDocument | null> {
    // Use the native MongoDB driver to bypass ALL Mongoose pre-hooks (including the soft-delete filter)
    const doc = await this.userModel.collection.findOne({ email });
    if (!doc) return null;
    return this.userModel.hydrate(doc) as unknown as UserDocument;
  }

  async findById(id: string): Promise<UserDocument | null> {
    const user = await this.userModel.findById(id).populate('cidadePreferida', 'nome uf').exec();
    if (!user) return null;
    return user;
  }

  async findByMatricula(matricula: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ matricula }).populate('cidadePreferida', 'nome uf').exec();
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, role?: string, status?: string, cityFilter?: string) {
    const skip = (page - 1) * limit;
    const conditions: any[] = [];

    // Filtro de Papel
    if (role) {
      conditions.push({ role });
    }

    // Filtro de Status (Padrão: não excluídos)
    if (status) {
      conditions.push({ status });
    } else {
      conditions.push({ status: { $ne: UserStatus.EXCLUDED } });
    }

    // Busca por texto (Nome, Sobrenome, Email, CPF, Matrícula)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      conditions.push({
        $or: [
          { nome: searchRegex },
          { sobrenome: searchRegex },
          { email: searchRegex },
          { cpf: searchRegex },
          { matricula: searchRegex },
        ],
      });
    }

    // Filtro de Cidade (para LOCAL_ADM)
    if (cityFilter) {
      const cityId = new Types.ObjectId(cityFilter);
      conditions.push({
        $or: [
          { cidadePreferida: cityId },
          { cidadeAdmin: cityId },
        ],
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('cidadePreferida', 'nome uf')
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();
  }

  async create(dto: any): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ 
      $or: [{ email: dto.email }, { cpf: dto.cpf }] 
    }).exec();

    if (existing) {
      throw new ConflictException('E-mail ou CPF já cadastrado.');
    }

    // Gerar matrícula
    const matricula = await this.generateNextMatricula();

    // Criptografar a senha se ela existir
    let hashedPassword = dto.password;
    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(dto.password, salt);
    }

    // Preparar o objeto para o Mongoose
    const userData: any = {
      ...dto,
      password: hashedPassword,
      matricula,
      telefones: dto.telefones || [],
      enderecos: dto.enderecos || [],
    };

    // Tratar campos aninhados se vierem como propriedades planas (caso do auto-registro)
    if (dto.temProblemaFisico !== undefined) {
      userData.saude = {
        temProblemaFisico: dto.temProblemaFisico,
        descricaoProblema: dto.descricaoProblema,
        temAlergia: dto.temAlergia,
        descricaoAlergia: dto.descricaoAlergia,
        temDietaEspecial: dto.temDietaEspecial,
        descricaoDieta: dto.descricaoDieta,
      };
    }

    if (dto.aceitouTermos !== undefined) {
      userData.lgpd = { aceitouTermos: dto.aceitouTermos, aceitouEm: new Date() };
    }

    const user = new this.userModel(userData);
    return user.save();
  }

  async updateResetToken(userId: string, token: string, expires: Date): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      resetPasswordToken: token,
      resetPasswordExpires: expires,
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashed,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });
  }

  async update(id: string, updateDto: any, adminId?: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const changes: any = {};
    const sensitiveFields = ['email', 'telefones', 'status', 'role'];
    
    // Limpeza do DTO: remover campos nulos ou vazios que são obrigatórios no Schema
    const cleanedDto = { ...updateDto };
    const requiredFields = ['nome', 'sobrenome', 'cpf', 'dataNascimento', 'cidadePreferida'];
    
    requiredFields.forEach(field => {
      if (cleanedDto[field] === null || cleanedDto[field] === undefined || cleanedDto[field] === '') {
        delete cleanedDto[field];
      }
    });

    sensitiveFields.forEach(field => {
      if (cleanedDto[field] !== undefined && JSON.stringify(cleanedDto[field]) !== JSON.stringify((user as any)[field])) {
        changes[field] = { old: (user as any)[field], new: cleanedDto[field] };
      }
    });

    // Verificação de conflito para campos únicos (E-mail/CPF)
    if (cleanedDto.email || cleanedDto.cpf) {
      const conflict = await this.userModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(cleanedDto.email ? [{ email: cleanedDto.email }] : []),
          ...(cleanedDto.cpf ? [{ cpf: cleanedDto.cpf }] : []),
        ],
      }).exec();

      if (conflict) {
        const field = conflict.email === cleanedDto.email ? 'E-mail' : 'CPF';
        throw new ConflictException(`${field} já está sendo utilizado por outro usuário.`);
      }
    }

    if (!user.matricula) {
      user.matricula = await this.generateNextMatricula();
    }

    Object.assign(user, cleanedDto);
    const previousStatus = user.status;
    const updatedUser = await user.save();

    if (Object.keys(changes).length > 0) {
      const performer = adminId || id;
      const action = adminId ? 'USER_UPDATE' : 'USER_SELF_UPDATE';
      await this.auditService.log(action, performer, id, changes);
    }

    if (previousStatus !== UserStatus.ACTIVE && cleanedDto.status === UserStatus.ACTIVE) {
      await this.mailService.sendAccountReactivatedEmail(updatedUser);
    }

    return updatedUser;
  }

  async sendResetPasswordEmail(id: string, adminId: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hora
    await user.save();

    await this.mailService.sendResetPasswordEmail(user, token);
    await this.auditService.log('PASSWORD_RESET_EMAIL', adminId, id);
  }

  async generateTemporaryPassword(id: string, adminId: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const tempPassword = Math.random().toString(36).substring(2, 10);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(tempPassword, salt);
    user.mustChangePassword = true;
    await user.save();

    await this.auditService.log('TEMP_PASSWORD_GENERATED', adminId, id);
    return tempPassword;
  }

  async verifyManual(id: string, adminId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    
    const previousStatus = user.status;
    user.status = UserStatus.ACTIVE;
    user.verificationCode = null as any;
    user.verificationCodeExpires = null as any;
    
    await user.save();
    await this.auditService.log('MANUAL_VERIFICATION', adminId, id, { previousStatus });
    await this.mailService.sendAccountReactivatedEmail(user);
    
    return user;
  }

  async remove(id: string, status: UserStatus = UserStatus.EXCLUDED, adminId?: string) {
    // Soft delete ou Bloqueio
    await this.userModel.findByIdAndUpdate(id, { status });
    if (adminId) {
      await this.auditService.log('STATUS_CHANGE', adminId, id, { newStatus: status });
    }
  }
  async getStats(cityFilter?: string) {
    const cityId = cityFilter ? new Types.ObjectId(cityFilter) : null;
    const baseMatch = cityId ? { 
      $or: [
        { cidadePreferida: cityId },
        { cidadeAdmin: cityId }
      ]
    } : {};

    const total = await this.userModel.countDocuments(baseMatch).exec();
    const active = await this.userModel.countDocuments({ ...baseMatch, status: UserStatus.ACTIVE }).exec();

    const byRole = await this.userModel.aggregate([
      ...(cityId ? [{ $match: baseMatch }] : []),
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const byParish = await this.userModel.aggregate([
      ...(cityId ? [{ $match: baseMatch }] : []),
      { $group: { _id: '$paroquia', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const latestUsers = await this.userModel
      .find(baseMatch)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('nome sobrenome email createdAt')
      .exec();

    return {
      total,
      active,
      cityFilter: cityFilter || null,
      byRole: byRole.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
      byParish: byParish.map(p => ({ name: p._id || 'Não informada', count: p.count })),
      latestUsers,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Senha atual incorreta.');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed });
    return { message: 'Senha alterada com sucesso.' };
  }

  async requestEmailChange(userId: string, newEmail: string) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.email === newEmail) {
      throw new ConflictException('O novo e-mail não pode ser igual ao atual.');
    }

    const emailExists = await this.userModel.findOne({ email: newEmail });
    if (emailExists) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    if (user.lastEmailChangeCodeSentAt && Date.now() - new Date(user.lastEmailChangeCodeSentAt).getTime() < 120000) {
      const segundosRestantes = Math.ceil((120000 - (Date.now() - new Date(user.lastEmailChangeCodeSentAt).getTime())) / 1000);
      throw new BadRequestException(`Aguarde ${segundosRestantes} segundos para solicitar um novo código.`);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await this.userModel.findByIdAndUpdate(userId, {
      pendingNewEmail: newEmail,
      emailChangeToken: code,
      emailChangeExpires: expires,
      lastEmailChangeCodeSentAt: new Date(),
    });

    await this.mailService.sendEmailChangeCodeEmail(newEmail, user, code);
    return { message: 'Código enviado para o novo e-mail.' };
  }

  async confirmEmailChange(userId: string, code: string, currentPassword: string) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Senha atual incorreta.');

    if (!user.pendingNewEmail || user.emailChangeToken !== code) {
      throw new UnauthorizedException('Código inválido ou não há troca pendente.');
    }

    if (user.emailChangeExpires && new Date(user.emailChangeExpires).getTime() < Date.now()) {
      throw new UnauthorizedException('Código expirado. Solicite um novo.');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      email: user.pendingNewEmail,
      pendingNewEmail: null,
      emailChangeToken: null,
      emailChangeExpires: null,
    });

    return { message: 'E-mail alterado com sucesso.' };
  }

  async cancelEmailChange(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      pendingNewEmail: null,
      emailChangeToken: null,
      emailChangeExpires: null,
    });
    return { message: 'Troca de e-mail cancelada.' };
  }

  async updateReactivationCode(userId: string, code: string, expires: Date): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      reactivationCode: code,
      reactivationCodeExpires: expires,
      lastReactivationCodeSentAt: new Date(),
    });
  }

  async reactivateAccount(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      status: UserStatus.ACTIVE,
      reactivationCode: null,
      reactivationCodeExpires: null,
    });
  }

  async deleteAccount(userId: string, currentPassword: string) {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Senha incorreta. Não foi possível excluir a conta.');

    // Soft delete
    await this.userModel.findByIdAndUpdate(userId, { status: UserStatus.EXCLUDED });
    
    return { message: 'Sua conta foi excluída com sucesso.' };
  }
}
