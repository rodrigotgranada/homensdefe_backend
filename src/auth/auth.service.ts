import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserStatus } from '../users/schemas/user.schema';
import { RegisterDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { UploadService } from '../firebase/upload.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private uploadService: UploadService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.password)) {
      if (user.status === UserStatus.PENDING) {
        return { requiresVerification: true, email: user.email, _id: user._id };
      }
      if (user.status === UserStatus.EXCLUDED) {
        return { requiresReactivation: true, email: user.email };
      }
      if (user.status === UserStatus.BLOCKED) {
        return { blocked: true, email: user.email };
      }
      if (user.status === UserStatus.INACTIVE) {
        return { inactive: true, email: user.email };
      }
      const { password, ...result } = user.toObject();
      return { ...result, mustChangePassword: user.mustChangePassword };
    }
    return null;
  }

  async login(user: any) {
    if (user.requiresVerification) {
      return { requiresVerification: true, email: user.email };
    }
    if (user.requiresReactivation) {
      return { requiresReactivation: true, email: user.email };
    }
    if (user.blocked) {
      return { blocked: true, message: 'Sua conta foi bloqueada. Entre em contato com a administração.' };
    }
    if (user.inactive) {
      return { inactive: true, message: 'Sua conta está inativa. Entre em contato com a administração.' };
    }
    
    const payload = { 
      email: user.email, 
      sub: user._id, 
      role: user.role,
      cidadeAdmin: user.cidadeAdmin // Incluído aqui
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, nome: user.nome, sobrenome: user.sobrenome, role: user.role, email: user.email, fotoUrl: user.fotoUrl, mustChangePassword: user.mustChangePassword },
    };
  }

  async register(dto: RegisterDto, file?: any) {
    // 1. Criar o usuário para obter o ID
    const user = await this.usersService.create(dto);
    
    // 2. Se houver arquivo, fazer upload para users/{id}/profile/
    if (file) {
      try {
        const fotoUrl = await this.uploadService.uploadUserProfilePhoto(String(user._id), file);
        // 3. Atualizar o usuário com a URL da foto
        await this.usersService.update(String(user._id), { fotoUrl });
        user.fotoUrl = fotoUrl;
      } catch (error) {
        console.error('Erro ao fazer upload da foto no registro:', error);
      }
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    await this.usersService.update(String(user._id), {
      verificationCode,
      verificationCodeExpires,
      lastVerificationCodeSentAt: new Date(),
    } as any);

    try {
      await this.mailService.sendVerificationCodeEmail(user, verificationCode);
    } catch (error) {
      console.error('Erro ao enviar e-mail de verificação:', error);
    }

    return { requiresVerification: true, email: user.email };
  }

  async verifyEmailCode(email: string, code: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    if (user.status !== UserStatus.PENDING) {
      throw new UnauthorizedException('Este usuário já foi verificado.');
    }

    if (user.verificationCode !== code) {
      throw new UnauthorizedException('Código inválido.');
    }

    if (user.verificationCodeExpires && new Date(user.verificationCodeExpires).getTime() < Date.now()) {
      throw new UnauthorizedException('Código expirado. Solicite um novo.');
    }

    // Marca como ACTIVE
    await this.usersService.update(String(user._id), {
      status: UserStatus.ACTIVE,
      verificationCode: null,
      verificationCodeExpires: null,
    } as any);

    // Gap 2: E-mail de boas-vindas (fire-and-forget, não bloqueia o login)
    this.mailService.sendWelcomeEmail(user).catch(() => {});

    user.status = UserStatus.ACTIVE;
    return this.login(user);
  }

  async resendVerificationCode(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    
    if (user.status !== UserStatus.PENDING) {
      throw new UnauthorizedException('Este usuário já foi verificado ou está inativo.');
    }

    if (user.lastVerificationCodeSentAt && Date.now() - new Date(user.lastVerificationCodeSentAt).getTime() < 120000) {
      const segundosRestantes = Math.ceil((120000 - (Date.now() - new Date(user.lastVerificationCodeSentAt).getTime())) / 1000);
      throw new BadRequestException(`Aguarde ${segundosRestantes} segundos para solicitar um novo código.`);
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours

    await this.usersService.update(String(user._id), {
      verificationCode,
      verificationCodeExpires,
      lastVerificationCodeSentAt: new Date(),
    } as any);

    try {
      await this.mailService.sendVerificationCodeEmail(user, verificationCode);
    } catch (error) {
      console.error('Erro ao reenviar e-mail de verificação:', error);
    }

    return { message: 'Novo código de verificação enviado para o seu e-mail.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmailIncludingExcluded(dto.email);

    if (!user) {
      // Security: always return success to prevent email enumeration
      return { message: 'Se o e-mail existir, você receberá um código de recuperação.' };
    }

    // Contas excluídas também podem recuperar a senha —
    // após redefinir, serão redirecionadas para o fluxo de reativação.
    if (user.lastResetPasswordCodeSentAt && Date.now() - new Date(user.lastResetPasswordCodeSentAt).getTime() < 120000) {
      const segundosRestantes = Math.ceil((120000 - (Date.now() - new Date(user.lastResetPasswordCodeSentAt).getTime())) / 1000);
      throw new BadRequestException(`Aguarde ${segundosRestantes} segundos para solicitar um novo código.`);
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersService.update(String(user._id), {
      resetPasswordToken: code,
      resetPasswordExpires: expires,
      lastResetPasswordCodeSentAt: new Date(),
    } as any);

    await this.mailService.sendResetPasswordEmail(user, code);

    return { message: 'Se o e-mail existir, você receberá um código de recuperação.' };
  }


  async validateResetCode(email: string, code: string) {
    const user = await this.usersService.findByEmailIncludingExcluded(email);
    if (!user) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    if (user.resetPasswordToken !== code) {
      throw new UnauthorizedException('Código inválido.');
    }

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      throw new UnauthorizedException('Código expirado. Solicite um novo.');
    }

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.usersService.findByEmailIncludingExcluded(dto.email);
    if (!user) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    if (user.resetPasswordToken !== dto.code) {
      throw new UnauthorizedException('Código inválido.');
    }

    if (user.resetPasswordExpires && new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      throw new UnauthorizedException('Código expirado. Solicite um novo.');
    }

    await this.usersService.updatePassword(String(user._id), dto.newPassword);

    // Se a conta estava excluída, sinalizar que o usuário precisa reativar
    if (user.status === UserStatus.EXCLUDED) {
      return {
        requiresReactivation: true,
        email: user.email,
        message: 'Senha redefinida! Sua conta ainda está inativa. Solicite a reativação para voltar a acessar.',
      };
    }

    return { message: 'Senha redefinida com sucesso.' };
  }

  async requestReactivation(email: string) {
    const user = await this.usersService.findByEmailIncludingExcluded(email);
    if (!user || user.status !== UserStatus.EXCLUDED) {
      throw new BadRequestException('Conta não encontrada ou não está excluída.');
    }

    if (user.lastReactivationCodeSentAt) {
      const elapsed = Date.now() - new Date(user.lastReactivationCodeSentAt).getTime();
      if (elapsed < 120000) {
        const wait = Math.ceil((120000 - elapsed) / 1000);
        throw new BadRequestException(`Aguarde ${wait} segundos para solicitar um novo código.`);
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.updateReactivationCode(String(user._id), code, expires);
    await this.mailService.sendReactivationCodeEmail(user, code);

    return { message: 'Código de reativação enviado para o seu e-mail.' };
  }

  async confirmReactivation(email: string, code: string) {
    const user = await this.usersService.findByEmailIncludingExcluded(email);
    if (!user || user.status !== UserStatus.EXCLUDED) {
      throw new UnauthorizedException('Conta não encontrada ou não está excluída.');
    }

    if (user.reactivationCode !== code) {
      throw new UnauthorizedException('Código inválido.');
    }

    if (!user.reactivationCodeExpires || new Date(user.reactivationCodeExpires).getTime() < Date.now()) {
      throw new UnauthorizedException('Código expirado. Solicite um novo.');
    }

    await this.usersService.reactivateAccount(String(user._id));

    // Log in automatically
    const payload = { email: user.email, sub: user._id, role: user.role, cidadeAdmin: user.cidadeAdmin };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user._id, nome: user.nome, sobrenome: user.sobrenome, role: user.role, email: user.email, fotoUrl: user.fotoUrl },
    };
  }

  async changePasswordForced(userId: string, newPass: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');

    await this.usersService.updatePassword(userId, newPass);
    await this.usersService.update(userId, { mustChangePassword: false } as any);
    
    return { success: true, message: 'Senha atualizada com sucesso!' };
  }
}
