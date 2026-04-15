import { Controller, Get, Patch, Body, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    const { password, resetPasswordToken, resetPasswordExpires, ...result } = user.toObject();
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateProfile(@Request() req, @Body() updateDto: any) {
    // In a real app, we'd use a DTO for validation
    return this.usersService.update(req.user.userId, updateDto);
  }
}
