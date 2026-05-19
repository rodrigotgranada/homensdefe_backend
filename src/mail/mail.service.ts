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
    const from = this.configService.get<string>('MAIL_FROM');
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');

    console.log('━━━━━ [MailService] Tentando enviar e-mail ━━━━━');
    console.log(`  → Para:     ${to}`);
    console.log(`  → Assunto:  ${subject}`);
    console.log(`  → De:       ${from}`);
    console.log(`  → MAIL_USER configurado: ${mailUser ? `SIM (${mailUser})` : 'NÃO ❌'}`);
    console.log(`  → MAIL_PASS configurado: ${mailPass ? 'SIM ✅' : 'NÃO ❌'}`);

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      console.log(`  ✅ E-mail enviado com sucesso! messageId: ${info.messageId}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('  ❌ Falha ao enviar e-mail:');
      console.error(`     Código:    ${error.code}`);
      console.error(`     Mensagem:  ${error.message}`);
      console.error(`     Resposta:  ${error.response || 'N/A'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      throw new InternalServerErrorException('Erro ao enviar e-mail.');
    }
  }


  async sendResetPasswordEmail(user: any, code: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Recuperação de Senha</h2>
        <p>Olá, ${user.nome}!</p>
        <p>Você solicitou a recuperação de sua senha no sistema <strong>Homens de Fé</strong>.</p>
        <p>Para criar uma nova senha, utilize o código de 6 dígitos abaixo na tela do sistema:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e40af; background: #f3f4f6; padding: 10px 20px; border-radius: 8px;">${code}</span>
        </div>
        <p>Se você não solicitou isso, pode ignorar este e-mail.</p>
        <p>Este código é válido por 1 hora.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Recuperação de Senha - Homens de Fé', html);
  }

  async sendVerificationCodeEmail(user: any, code: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Bem-vindo(a), ${user.nome}!</h2>
        <p>Você iniciou seu cadastro no sistema <strong>Homens de Fé</strong>.</p>
        <p>Para ativar sua conta e validar seu e-mail, utilize o código de verificação abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f3f4f6; color: #1f2937; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: 900; letter-spacing: 5px;">${code}</span>
        </div>
        <p>Este código é válido por 10 minutos.</p>
        <p>Se você não solicitou este cadastro, pode ignorar este e-mail.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Código de Verificação - Homens de Fé', html);
  }

  async sendEmailChangeCodeEmail(newEmail: string, user: any, code: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Confirmação de Troca de E-mail</h2>
        <p>Olá, ${user.nome}!</p>
        <p>Você solicitou a alteração do seu endereço de e-mail no sistema <strong>Homens de Fé</strong>.</p>
        <p>Para confirmar esta alteração, utilize o código de verificação abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f3f4f6; color: #1f2937; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: 900; letter-spacing: 5px;">${code}</span>
        </div>
        <p>Este código é válido por 10 minutos.</p>
        <p>Se você não solicitou isso, pode ignorar este e-mail. Seu e-mail atual não será alterado até que a confirmação seja feita.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(newEmail, 'Confirmação de Troca de E-mail - Homens de Fé', html);
  }

  async sendReactivationCodeEmail(user: any, code: string) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Reativação de Conta - Homens de Fé</h2>
        <p>Olá, ${user.nome}!</p>
        <p>Recebemos uma solicitação para reativar sua conta no sistema <strong>Homens de Fé</strong>.</p>
        <p>Para confirmar a reativação, utilize o código abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="background-color: #f3f4f6; color: #1f2937; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: 900; letter-spacing: 5px;">${code}</span>
        </div>
        <p>Este código é válido por <strong>10 minutos</strong>.</p>
        <p>Se você não solicitou a reativação, pode ignorar este e-mail. Sua conta continuará inativa.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Reativação de Conta - Homens de Fé', html);
  }

  async sendWelcomeEmail(user: any) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #2563eb; font-size: 28px; margin: 0;">Homens de Fé</h1>
        </div>
        <h2 style="color: #1f2937;">Bem-vindo, ${user.nome}! 🎉</h2>
        <p>Sua conta foi ativada com sucesso e você já faz parte da comunidade <strong>Homens de Fé</strong>.</p>
        <p>A partir de agora você pode:</p>
        <ul style="color: #374151; line-height: 2;">
          <li>Acessar e completar seu perfil</li>
          <li>Participar de eventos e retiros</li>
          <li>Interagir com a comunidade</li>
        </ul>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://homensdefe.com.br'}/login"
             style="background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Acessar Minha Conta
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Bem-vindo ao Homens de Fé! ✝️', html);
  }

  async sendAccountReactivatedEmail(user: any) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">Conta Reativada! ⚡</h2>
        <p>Olá, ${user.nome}!</p>
        <p>Temos o prazer de informar que sua conta no sistema <strong>Homens de Fé</strong> foi reativada por um administrador.</p>
        <p>Você já pode acessar o sistema novamente com seu e-mail e senha habituais.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.FRONTEND_URL || 'https://homensdefe.com.br'}/login"
             style="background-color: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
            Fazer Login agora
          </a>
        </div>
        <p>Se você tiver qualquer dúvida, entre em contato com o administrador da sua região.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">Equipe Homens de Fé</p>
      </div>
    `;

    await this.sendMail(user.email, 'Sua conta foi reativada - Homens de Fé', html);
  }
}
