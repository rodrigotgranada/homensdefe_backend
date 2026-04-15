import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const from = this.configService.get<string>('MAIL_FROM');
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email send failed:', error);
      throw new InternalServerErrorException('Erro ao enviar e-mail.');
    }
  }

  async sendResetPasswordEmail(user: any, token: string) {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'}/admin/reset-senha?token=${token}`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Recuperação de Senha</h2>
        <p>Olá, ${user.nome}!</p>
        <p>Você solicitou a recuperação de sua senha no sistema <strong>Homens de Fé</strong>.</p>
        <p>Para criar uma nova senha, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
        </div>
        <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
        <p>Este link é válido por 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Recuperação de Senha - Homens de Fé', html);
  }
}
