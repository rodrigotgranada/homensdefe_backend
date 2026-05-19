import { Controller, Post, Patch, Body, UnauthorizedException, UseInterceptors, UploadedFile, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto, RegisterDto, ForgotPasswordDto, ResetPasswordDto, VerifyCodeDto, ResendCodeDto, RequestReactivationDto, ConfirmReactivationDto } from './dto/auth.dto';

@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 tentativas por minuto por IP nas rotas de auth
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciais inválidas. Verifique seu e-mail e senha.');
    return this.authService.login(user);
  }

  @Post('register')
  @SkipThrottle() // Registro é um fluxo longo já protegido por validações de negócio
  @UseInterceptors(FileInterceptor('foto'))
  async register(
    @Body() dto: RegisterDto,
    @UploadedFile() file?: any
  ) {
    console.log('--- Novo Registro ---');
    console.log('DTO:', dto.email);
    console.log('Arquivo recebido:', file ? `${file.originalname} (${file.size} bytes)` : 'Nenhum arquivo');
    return this.authService.register(dto, file);
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyEmailCode(dto.email, dto.code);
  }

  @Post('resend-code')
  async resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendVerificationCode(dto.email);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('validate-reset-code')
  async validateResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.validateResetCode(body.email, body.code);
  }

  @Post('request-reactivation')
  async requestReactivation(@Body() dto: RequestReactivationDto) {
    return this.authService.requestReactivation(dto.email);
  }

  @Post('confirm-reactivation')
  async confirmReactivation(@Body() dto: ConfirmReactivationDto) {
    return this.authService.confirmReactivation(dto.email, dto.code);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password-forced')
  async changePasswordForced(@Request() req, @Body() body: { newPassword: string }) {
    return this.authService.changePasswordForced(req.user._id, body.newPassword);
  }
}
