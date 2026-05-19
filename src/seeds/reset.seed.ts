/**
 * RESET SEED — Homens de Fé
 * 
 * Apaga todos os usuários, cidades e contadores e cria:
 *  - 2 Cidades: São Paulo (SP) e Curitiba (PR)
 *  - 1 SUPER_ADM  (acesso global)
 *  - 1 LOCAL_ADM por cidade (2 total)
 *  - 2 USERs por cidade (4 total)
 *  - Inicializa o contador de matrículas
 * 
 * Execução:
 *   npm run seed:reset
 */

import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega o .env.dev do backend
dotenv.config({ path: path.resolve(__dirname, '../../.env.dev'), override: true });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌  MONGO_URI não encontrada no .env.dev');
  process.exit(1);
}

// ─────────────────────────── SCHEMAS ────────────────────────────────────────

const CitySchema = new mongoose.Schema(
  {
    nome:           { type: String, required: true },
    uf:             { type: String, required: true },
    slug:           { type: String, required: true, unique: true },
    status:         { type: String, enum: ['PENDING', 'ACTIVE'], default: 'ACTIVE' },
    adminLocalRefs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
    quemSomosLocal: String,
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
    matricula:         { type: String, unique: true },
    nome:              { type: String, required: true },
    sobrenome:         { type: String, required: true },
    cpf:               { type: String, required: true, unique: true },
    email:             { type: String, required: true, unique: true },
    password:          { type: String, required: true },
    role:              { type: String, enum: ['SUPER_ADM', 'LOCAL_ADM', 'USER'], default: 'USER' },
    status:            { type: String, enum: ['ACTIVE', 'INACTIVE', 'BLOCKED', 'EXCLUDED', 'PENDING'], default: 'ACTIVE' },
    cidadePreferida:   { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    cidadeAdmin:       { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    telefones:         { type: Array, default: [] },
    enderecos:         { type: Array, default: [] },
    saude:             { type: Object, default: {} },
    lgpd:              { type: Object, default: {} },
    paroquia:          String,
    dataNascimento:    Date,
    altura:            Number,
    peso:              Number,
  },
  { timestamps: true }
);

const CounterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq:  { type: Number, default: 0 }
});

// ─────────────────────────── HELPER ─────────────────────────────────────────

const hash = (pwd: string) => bcrypt.hash(pwd, 10);
const now  = new Date();
const currentYear = now.getFullYear().toString().slice(-2);

// ─────────────────────────── SEED DATA ──────────────────────────────────────

async function run() {
  console.log('\n🌱  Conectando ao MongoDB...');
  await mongoose.connect(MONGO_URI!);
  console.log('✅  Conectado!');

  const CityModel = mongoose.models['City'] ?? mongoose.model('City', CitySchema);
  const UserModel = mongoose.models['User'] ?? mongoose.model('User', UserSchema);
  const CounterModel = mongoose.models['Counter'] ?? mongoose.model('Counter', CounterSchema);

  // ── Limpar coleções ────────────────────────────────────────────────────────
  console.log('\n🗑️   Limpando coleções: users, cities, counters...');
  await UserModel.deleteMany({});
  await CityModel.deleteMany({});
  await CounterModel.deleteMany({});
  console.log('    Coleções limpas.');

  // ── Criar Cidades ──────────────────────────────────────────────────────────
  console.log('\n🏙️   Criando cidades...');

  const cidadeSP = await CityModel.create({
    nome: 'São Paulo', uf: 'SP', slug: 'sao-paulo', status: 'ACTIVE'
  });

  const cidadeCWB = await CityModel.create({
    nome: 'Curitiba', uf: 'PR', slug: 'curitiba', status: 'ACTIVE'
  });

  // ── Criar Usuários ─────────────────────────────────────────────────────────
  console.log('\n👤  Criando usuários com matrículas...');

  // SUPER ADM
  await UserModel.create({
    matricula:      `HF${currentYear}0001`,
    nome:           'Super',
    sobrenome:      'Admin',
    cpf:            '00000000001',
    email:          'super@homensdefe.com',
    password:       await hash('Admin123'),
    role:           'SUPER_ADM',
    status:         'ACTIVE',
    paroquia:       'Global',
    lgpd:           { aceitouTermos: true, aceitouEm: now },
    saude:          { temProblemaFisico: false, temAlergia: false, temDietaEspecial: false },
  });

  // LOCAL ADM — São Paulo
  const localAdmSP = await UserModel.create({
    matricula:      `HF${currentYear}0002`,
    nome:           'Carlos',
    sobrenome:      'Oliveira',
    cpf:            '11111111101',
    email:          'admin.sp@homensdefe.com',
    password:       await hash('Admin123'),
    role:           'LOCAL_ADM',
    status:         'ACTIVE',
    cidadePreferida: cidadeSP._id,
    cidadeAdmin:    cidadeSP._id,
    paroquia:       'Paróquia São Paulo Centro',
    telefones:      [{ numero: '(11) 99999-0001', isWhatsApp: true, isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
    saude:          { temProblemaFisico: false, temAlergia: false, temDietaEspecial: false },
  });

  // LOCAL ADM — Curitiba
  const localAdmCWB = await UserModel.create({
    matricula:      `HF${currentYear}0003`,
    nome:           'Ricardo',
    sobrenome:      'Ferreira',
    cpf:            '22222222201',
    email:          'admin.cwb@homensdefe.com',
    password:       await hash('Admin123'),
    role:           'LOCAL_ADM',
    status:         'ACTIVE',
    cidadePreferida: cidadeCWB._id,
    cidadeAdmin:    cidadeCWB._id,
    paroquia:       'Paróquia Nossa Sra. da Luz',
    telefones:      [{ numero: '(41) 98888-0001', isWhatsApp: true, isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
    saude:          { temProblemaFisico: false, temAlergia: false, temDietaEspecial: false },
  });

  // USERs São Paulo
  await UserModel.create({
    matricula:      `HF${currentYear}0004`,
    nome:           'João', sobrenome: 'Silva', cpf: '33333333301', email: 'joao.sp@homensdefe.com',
    password:       await hash('User1234'), role: 'USER', status: 'ACTIVE',
    cidadePreferida: cidadeSP._id, paroquia: 'Paróquia São Paulo Centro',
    telefones:      [{ numero: '(11) 97777-0001', isWhatsApp: true, isPrincipal: true }],
    enderecos:      [{ cep: '01310-100', logradouro: 'Avenida Paulista', numero: '100', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
  });

  await UserModel.create({
    matricula:      `HF${currentYear}0005`,
    nome:           'Pedro', sobrenome: 'Santos', cpf: '44444444401', email: 'pedro.sp@homensdefe.com',
    password:       await hash('User1234'), role: 'USER', status: 'ACTIVE',
    cidadePreferida: cidadeSP._id, paroquia: 'Paróquia São Paulo Centro',
    telefones:      [{ numero: '(11) 96666-0001', isWhatsApp: false, isPrincipal: true }],
    enderecos:      [{ cep: '01310-200', logradouro: 'Rua Augusta', numero: '500', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP', isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
  });

  // USERs Curitiba
  await UserModel.create({
    matricula:      `HF${currentYear}0006`,
    nome:           'Marcos', sobrenome: 'Lima', cpf: '55555555501', email: 'marcos.cwb@homensdefe.com',
    password:       await hash('User1234'), role: 'USER', status: 'ACTIVE',
    cidadePreferida: cidadeCWB._id, paroquia: 'Paróquia Nossa Sra. da Luz',
    telefones:      [{ numero: '(41) 97777-0001', isWhatsApp: true, isPrincipal: true }],
    enderecos:      [{ cep: '80010-010', logradouro: 'Rua XV de Novembro', numero: '200', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
  });

  await UserModel.create({
    matricula:      `HF${currentYear}0007`,
    nome:           'Lucas', sobrenome: 'Costa', cpf: '66666666601', email: 'lucas.cwb@homensdefe.com',
    password:       await hash('User1234'), role: 'USER', status: 'ACTIVE',
    cidadePreferida: cidadeCWB._id, paroquia: 'Paróquia Nossa Sra. da Luz',
    telefones:      [{ numero: '(41) 96666-0001', isWhatsApp: true, isPrincipal: true }],
    enderecos:      [{ cep: '80050-000', logradouro: 'Rua Marechal Deodoro', numero: '750', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR', isPrincipal: true }],
    lgpd:           { aceitouTermos: true, aceitouEm: now },
  });

  // ── Inicializar Contador ───────────────────────────────────────────────────
  console.log('\n🔢  Inicializando contador de matrículas em 7...');
  await CounterModel.create({ name: 'user_matricula', seq: 7 });

  // ── Atualizar adminLocalRefs nas cidades ───────────────────────────────────
  await CityModel.findByIdAndUpdate(cidadeSP._id,  { adminLocalRefs: [localAdmSP._id]  });
  await CityModel.findByIdAndUpdate(cidadeCWB._id, { adminLocalRefs: [localAdmCWB._id] });

  console.log('\n✅  SEED CONCLUÍDO COM SUCESSO!\n');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Erro no seed:', err);
  process.exit(1);
});
