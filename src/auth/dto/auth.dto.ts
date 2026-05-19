import { IsEmail, IsNotEmpty, IsString, MinLength, IsDateString, IsBoolean, IsOptional, IsNumber, Matches } from 'class-validator';
import { Transform, Type } from 'class-transformer';

class RegisterTelefoneDto {
  @IsString()
  @IsNotEmpty()
  numero: string;

  @IsBoolean()
  @IsOptional()
  isWhatsApp: boolean;

  @IsBoolean()
  @IsOptional()
  isPrincipal: boolean;
}

class RegisterEnderecoDto {
  @IsString() @IsNotEmpty() cep: string;
  @IsString() @IsNotEmpty() logradouro: string;
  @IsString() @IsNotEmpty() numero: string;
  @IsString() @IsOptional() complemento?: string;
  @IsString() @IsNotEmpty() bairro: string;
  @IsString() @IsNotEmpty() cidade: string;
  @IsString() @IsNotEmpty() uf: string;
  @IsString() @IsOptional() referencia?: string;
  @IsString() @IsOptional() tipo?: string;
  @IsBoolean() @IsOptional() isPrincipal: boolean;
}

class RegisterContatoEmergenciaDto {
  @IsString() @IsNotEmpty() nome: string;
  @IsString() @IsNotEmpty() telefone: string;
  @IsString() @IsNotEmpty() parentesco: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsString()
  @IsNotEmpty()
  sobrenome: string;

  @IsString()
  @IsNotEmpty()
  cpf: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'A senha deve conter letras e números.' })
  password: string;

  @IsString()
  @IsNotEmpty()
  dataNascimento: string;

  @IsOptional()
  @Transform(({ value }) => {
    try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return value; }
  })
  @Type(() => RegisterTelefoneDto)
  telefones: RegisterTelefoneDto[];

  @IsOptional()
  @Transform(({ value }) => {
    try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return value; }
  })
  @Type(() => RegisterEnderecoDto)
  enderecos: RegisterEnderecoDto[];

  @IsString()
  @IsOptional()
  paroquia?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  altura?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  peso?: number;

  @IsString()
  @IsOptional()
  cidadePreferida?: string;

  @IsString()
  @IsOptional()
  indicadoPor?: string;

  @IsOptional()
  @Transform(({ value }) => {
    try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return value; }
  })
  @Type(() => RegisterContatoEmergenciaDto)
  contatoEmergencia?: RegisterContatoEmergenciaDto;

  // Campos de saúde com transformação para boolean
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  temProblemaFisico?: boolean;

  @IsString()
  @IsOptional()
  descricaoProblema?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  temAlergia?: boolean;

  @IsString()
  @IsOptional()
  descricaoAlergia?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  temDietaEspecial?: boolean;

  @IsString()
  @IsOptional()
  descricaoDieta?: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  aceitouTermos: boolean;
}

export class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @IsNotEmpty({ message: 'Senha é obrigatória' })
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'A senha deve conter letras e números.' })
  newPassword: string;
}

export class VerifyCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ResendCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class RequestReactivationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ConfirmReactivationDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
