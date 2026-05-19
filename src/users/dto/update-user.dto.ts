import { IsString, IsOptional, IsEmail, IsDateString, IsNumber, IsBoolean, IsArray, ValidateNested, IsEnum, MinLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class TelefoneDto {
  @IsString()
  numero: string;

  @IsBoolean()
  @IsOptional()
  isWhatsApp?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrincipal?: boolean;
}

class EnderecoDto {
  @IsString() @IsOptional() cep?: string;
  @IsString() @IsOptional() logradouro?: string;
  @IsString() @IsOptional() numero?: string;
  @IsString() @IsOptional() complemento?: string;
  @IsString() @IsOptional() bairro?: string;
  @IsString() @IsOptional() cidade?: string;
  @IsString() @IsOptional() uf?: string;
  @IsBoolean() @IsOptional() isPrincipal?: boolean;
}

class InformacoesSaudeDto {
  @IsBoolean()
  @IsOptional()
  temProblemaFisico?: boolean;

  @IsString()
  @IsOptional()
  descricaoProblema?: string;

  @IsBoolean()
  @IsOptional()
  temAlergia?: boolean;

  @IsString()
  @IsOptional()
  descricaoAlergia?: string;

  @IsBoolean()
  @IsOptional()
  temDietaEspecial?: boolean;

  @IsString()
  @IsOptional()
  descricaoDieta?: string;
}

class ContatoEmergenciaDto {
  @IsString()
  nome: string;

  @IsString()
  telefone: string;

  @IsString()
  parentesco: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nome?: string;

  @IsString()
  @IsOptional()
  sobrenome?: string;

  @IsDateString()
  @IsOptional()
  dataNascimento?: string;

  @IsNumber()
  @IsOptional()
  altura?: number;

  @IsNumber()
  @IsOptional()
  peso?: number;

  @IsString()
  @IsOptional()
  fotoUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelefoneDto)
  @IsOptional()
  telefones?: TelefoneDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnderecoDto)
  @IsOptional()
  enderecos?: EnderecoDto[];

  @IsString()
  @IsOptional()
  cidadePreferida?: string; // ID da Cidade

  @ValidateNested()
  @Type(() => InformacoesSaudeDto)
  @IsOptional()
  saude?: InformacoesSaudeDto;

  @ValidateNested()
  @Type(() => ContatoEmergenciaDto)
  @IsOptional()
  contatoEmergencia?: ContatoEmergenciaDto;

  @IsString()
  @IsOptional()
  indicadoPor?: string;

  @IsString()
  @IsOptional()
  paroquia?: string;
}

export enum UserRole {
  SUPER_ADM = 'SUPER_ADM',
  LOCAL_ADM = 'LOCAL_ADM',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  EXCLUDED = 'EXCLUDED',
  PENDING = 'PENDING',
}

export class AdminUpdateUserDto extends UpdateUserDto {
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsString()
  @IsOptional()
  cidadeAdmin?: string; // ID da Cidade que ele gerencia
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter pelo menos 6 caracteres.' })
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, { message: 'A senha deve conter letras e números.' })
  newPassword: string;
}

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail: string;
}

export class ConfirmEmailChangeDto {
  @IsString()
  code: string;

  @IsString()
  currentPassword: string;
}

export class DeleteAccountDto {
  @IsString()
  currentPassword: string;
}
