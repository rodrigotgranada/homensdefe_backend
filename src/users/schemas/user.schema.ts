import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class Telefone {
  @Prop({ required: true })
  numero: string;

  @Prop({ default: false })
  isWhatsApp: boolean;

  @Prop({ default: false })
  isPrincipal: boolean;
}

@Schema({ _id: false })
export class InformacoesSaude {
  @Prop({ default: false })
  temProblemaFisico: boolean;

  @Prop()
  descricaoProblema: string;

  @Prop({ default: false })
  temAlergia: boolean;

  @Prop()
  descricaoAlergia: string;

  @Prop({ default: false })
  temDietaEspecial: boolean;

  @Prop()
  descricaoDieta: string;
}

@Schema({ _id: false })
export class ContatoEmergencia {
  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  telefone: string;

  @Prop({ required: true })
  parentesco: string;
}

@Schema({ _id: false })
export class Lgpd {
  @Prop({ required: true })
  aceitouTermos: boolean;

  @Prop({ required: true })
  aceitouEm: Date;
}

@Schema({ _id: false })
export class Endereco {
  @Prop()
  cep: string;

  @Prop()
  logradouro: string;

  @Prop()
  numero: string;

  @Prop()
  complemento: string;

  @Prop()
  bairro: string;

  @Prop()
  cidade: string;

  @Prop()
  uf: string;

  @Prop()
  referencia: string;

  @Prop()
  tipo: string;

  @Prop({ default: false })
  isPrincipal: boolean;
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

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  matricula: string;

  @Prop({ required: true })
  nome: string;

  @Prop({ required: true })
  sobrenome: string;

  @Prop({ required: true, unique: true })
  cpf: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  dataNascimento: Date;

  @Prop()
  altura: number;

  @Prop()
  peso: number;

  @Prop()
  fotoUrl: string;

  @Prop({ type: [Telefone], default: [] })
  telefones: Telefone[];

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: Types.ObjectId, ref: 'City' })
  cidadePreferida: Types.ObjectId;

  @Prop({ type: [Endereco], default: [] })
  enderecos: Endereco[];

  @Prop({ type: Types.ObjectId, ref: 'City' })
  cidadeAdmin: Types.ObjectId;

  @Prop({ type: InformacoesSaude })
  saude: InformacoesSaude;

  @Prop({ type: ContatoEmergencia })
  contatoEmergencia: ContatoEmergencia;

  @Prop()
  indicadoPor: string; // E-mail ou Celular

  @Prop()
  paroquia: string;

  @Prop({ type: Lgpd })
  lgpd: Lgpd;

  @Prop({ enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Prop()
  verificationCode: string;

  @Prop()
  verificationCodeExpires: Date;

  @Prop()
  lastVerificationCodeSentAt: Date;

  @Prop()
  lastLogin: Date;

  @Prop({ default: false })
  mustChangePassword: boolean;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  lastResetPasswordCodeSentAt: Date;

  @Prop()
  pendingNewEmail: string;

  @Prop()
  emailChangeToken: string;

  @Prop()
  emailChangeExpires: Date;

  @Prop()
  lastEmailChangeCodeSentAt: Date;

  @Prop()
  resetPasswordExpires: Date;

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;

  @Prop()
  reactivationCode: string;

  @Prop()
  reactivationCodeExpires: Date;

  @Prop()
  lastReactivationCodeSentAt: Date;

  @Prop()
  adminNotes: string;
}

export const UserSchema = SchemaFactory.createForClass(User);


