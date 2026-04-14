import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class Telefone {
  @Prop({ required: true })
  numero: string;

  @Prop({ default: false })
  isWhats: boolean;

  @Prop({ default: false })
  isPrimary: boolean;
}

@Schema({ _id: false })
export class Saude {
  @Prop({ default: false })
  temProblemaFisico: boolean;

  @Prop()
  descricao: string;

  @Prop()
  alergias: string;
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
}

@Schema({ timestamps: true })
export class User {
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

  @Prop()
  originCity: string;

  @Prop({ type: Saude })
  saude: Saude;

  @Prop({ type: ContatoEmergencia })
  contatoEmergencia: ContatoEmergencia;

  @Prop()
  indicacao: string;

  @Prop()
  paroquia: string;

  @Prop({ type: Lgpd })
  lgpd: Lgpd;

  @Prop({ enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop()
  lastLogin: Date;

  @Prop()
  resetPasswordToken: string;

  @Prop()
  resetPasswordExpires: Date;

  @Prop()
  createdBy: string;

  @Prop()
  updatedBy: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure that "EXCLUDED" users do not appear by default (soft delete logic can be added/extended via hooks if globally required)
UserSchema.pre('find', function () {
  this.where({ status: { $ne: UserStatus.EXCLUDED } });
});

UserSchema.pre('findOne', function () {
  this.where({ status: { $ne: UserStatus.EXCLUDED } });
});
