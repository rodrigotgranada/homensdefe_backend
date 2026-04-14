import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserStatus } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/auth.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).exec();
  }

  async create(dto: RegisterDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ 
      $or: [{ email: dto.email }, { cpf: dto.cpf }] 
    }).exec();

    if (existing) {
      throw new ConflictException('E-mail ou CPF já cadastrado.');
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = new this.userModel({
      ...dto,
      password: hashed,
      lgpd: { aceitouTermos: dto.aceitouTermos, aceitouEm: new Date() },
    });
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
}
