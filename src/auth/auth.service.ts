import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, nome: user.nome, sobrenome: user.sobrenome, role: user.role, email: user.email },
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const payload = { email: user.email, sub: user._id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, nome: user.nome, sobrenome: user.sobrenome, role: user.role, email: user.email },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Security: always return success to prevent email enumeration
      return { message: 'Se o e-mail existir, você receberá um link de recuperação.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.updateResetToken(String(user._id), token, expires);

    await this.mailService.sendResetPasswordEmail(user, token);

    return { message: 'Se o e-mail existir, você receberá um link de recuperação.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByResetToken(dto.token);
    if (!user) {
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
    await this.usersService.updatePassword(String(user._id), dto.newPassword);
    return { message: 'Senha redefinida com sucesso.' };
  }
}

