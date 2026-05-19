import { Controller, Get, Patch, Post, Delete, Param, Query, Body, UseGuards, Request, NotFoundException, ForbiddenException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UploadService } from '../firebase/upload.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, UserStatus, UserDocument } from './schemas/user.schema';
import { UpdateUserDto, AdminUpdateUserDto, ChangePasswordDto, RequestEmailChangeDto, ConfirmEmailChangeDto, DeleteAccountDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
  ) {}

  // Helper para buscar usuário por ID ou Matrícula
  private async resolveUser(idOrMatricula: string): Promise<UserDocument> {
    let user: UserDocument | null;
    if (Types.ObjectId.isValid(idOrMatricula)) {
      user = await this.usersService.findById(idOrMatricula);
    } else {
      user = await this.usersService.findByMatricula(idOrMatricula);
    }
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  @Get('check-availability')
  async checkAvailability(@Query('email') email?: string, @Query('cpf') cpf?: string, @Query('phone') phone?: string) {
    return this.usersService.checkAvailability(email, cpf, phone);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const { password, resetPasswordToken, resetPasswordExpires, ...result } = user.toObject();
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Request() req, @Body() updateDto: UpdateUserDto) {
    return this.usersService.update(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/photo')
  @UseInterceptors(FileInterceptor('foto'))
  async uploadPhoto(@Request() req, @UploadedFile() file: any) {
    if (!file) throw new NotFoundException('Arquivo não enviado.');
    const fotoUrl = await this.uploadService.uploadUserProfilePhoto(req.user.userId, file);
    const updated = await this.usersService.update(req.user.userId, { fotoUrl });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    const { password, resetPasswordToken, resetPasswordExpires, ...result } = updated.toObject();
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/change-password')
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/request-email-change')
  async requestEmailChange(@Request() req, @Body() dto: RequestEmailChangeDto) {
    return this.usersService.requestEmailChange(req.user.userId, dto.newEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/confirm-email-change')
  async confirmEmailChange(@Request() req, @Body() dto: ConfirmEmailChangeDto) {
    return this.usersService.confirmEmailChange(req.user.userId, dto.code, dto.currentPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/cancel-email-change')
  async cancelEmailChange(@Request() req) {
    return this.usersService.cancelEmailChange(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(@Request() req, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteAccount(req.user.userId, dto.currentPassword);
  }

  // Administrative Endpoints
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Get('stats')
  async getStats(@Request() req) {
    const cityFilter = req.user.role === UserRole.LOCAL_ADM ? req.user.cidadeAdmin : undefined;
    return this.usersService.getStats(cityFilter);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Get()
  async findAll(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    let cityFilter = undefined;
    if (req.user.role === UserRole.LOCAL_ADM) {
      cityFilter = req.user.cidadeAdmin;
      if (!cityFilter) throw new ForbiddenException('Administrador local sem cidade atribuída.');
    }
    return this.usersService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      role,
      status,
      cityFilter
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Post()
  async createUser(@Request() req, @Body() createUserDto: any) {
    if (req.user.role === UserRole.LOCAL_ADM) {
      createUserDto.cidadePreferida = req.user.cidadeAdmin;
    }
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const newUser = await this.usersService.create({
      ...createUserDto,
      password: tempPassword,
      mustChangePassword: true,
      status: UserStatus.ACTIVE,
    });
    await this.auditService.log('USER_MANUAL_CREATE', req.user._id, String(newUser._id), { email: newUser.email });
    return { user: newUser, tempPassword };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('foto'))
  async uploadUserPhoto(@Request() req, @Param('id') id: string, @UploadedFile() file: any) {
    if (!file) throw new NotFoundException('Arquivo não enviado.');
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      const isAdminThemself = String(user._id) === String(req.user.userId);
      if (String(cityId) !== String(req.user.cidadeAdmin) && !isAdminThemself) {
        throw new ForbiddenException('Sem permissão.');
      }
    }
    const fotoUrl = await this.uploadService.uploadUserProfilePhoto(String(user._id), file);
    await this.usersService.update(String(user._id), { fotoUrl }, req.user._id);
    return { fotoUrl };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      const isAdminThemself = String(user._id) === String(req.user.userId);
      if (String(cityId) !== String(req.user.cidadeAdmin) && !isAdminThemself) {
        throw new ForbiddenException('Você não tem permissão para visualizar este usuário.');
      }
    }
    const { password, resetPasswordToken, resetPasswordExpires, ...result } = user.toObject();
    return result;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Patch(':id')
  async update(@Request() req, @Param('id') id: string, @Body() updateDto: AdminUpdateUserDto) {
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      const isAdminThemself = String(user._id) === String(req.user.userId);
      if (String(cityId) !== String(req.user.cidadeAdmin) && !isAdminThemself) {
        throw new ForbiddenException('Sem permissão para editar este usuário.');
      }
      delete updateDto.role;
      delete updateDto.cidadeAdmin;
    }
    return this.usersService.update(String(user._id), updateDto, req.user._id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Post(':id/reset-password-email')
  async sendResetEmail(@Request() req, @Param('id') id: string) {
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      if (String(cityId) !== String(req.user.cidadeAdmin)) throw new ForbiddenException('Sem permissão.');
    }
    return this.usersService.sendResetPasswordEmail(String(user._id), req.user._id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Post(':id/generate-temp-password')
  async generateTemp(@Request() req, @Param('id') id: string) {
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      if (String(cityId) !== String(req.user.cidadeAdmin)) throw new ForbiddenException('Sem permissão.');
    }
    const tempPassword = await this.usersService.generateTemporaryPassword(String(user._id), req.user._id);
    return { tempPassword };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Patch(':id/verify-manual')
  async verifyManual(@Request() req, @Param('id') id: string) {
    const user = await this.resolveUser(id);
    return this.usersService.verifyManual(String(user._id), req.user._id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADM, UserRole.LOCAL_ADM)
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string, @Query('status') status?: string) {
    const user = await this.resolveUser(id);
    if (req.user.role === UserRole.LOCAL_ADM) {
      const cityId = user.cidadePreferida?._id || user.cidadePreferida;
      if (String(cityId) !== String(req.user.cidadeAdmin)) throw new ForbiddenException('Sem permissão.');
    }
    return this.usersService.remove(String(user._id), status as any);
  }
}
