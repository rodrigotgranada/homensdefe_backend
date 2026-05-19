import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from './users/schemas/user.schema';
import { CityStatus } from './cities/schemas/city.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());

  console.log('🌱 Starting expanded database seed...');

  // Reset collections
  await connection.dropDatabase();
  console.log('🗑️ Database cleared.');

  const hashedPassword = await bcrypt.hash('123456', 10);
  const currentYear = new Date().getFullYear().toString().slice(-2);

  // 1. Create Users with Matricula
  const superAdm = await connection.collection('users').insertOne({
    matricula: `HF${currentYear}0001`,
    nome: 'Super',
    sobrenome: 'Admin Geral',
    cpf: '00000000001',
    email: 'super@homensdefe.com.br',
    password: hashedPassword,
    dataNascimento: new Date('1980-01-01'),
    role: UserRole.SUPER_ADM,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const localAdmPelotas = await connection.collection('users').insertOne({
    matricula: `HF${currentYear}0002`,
    nome: 'Admin',
    sobrenome: 'Pelotas',
    cpf: '00000000002',
    email: 'pelotas@homensdefe.com.br',
    password: hashedPassword,
    dataNascimento: new Date('1985-01-01'),
    role: UserRole.LOCAL_ADM,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const localAdmPoa = await connection.collection('users').insertOne({
    matricula: `HF${currentYear}0003`,
    nome: 'Admin',
    sobrenome: 'Porto Alegre',
    cpf: '00000000003',
    email: 'poa@homensdefe.com.br',
    password: hashedPassword,
    dataNascimento: new Date('1988-01-01'),
    role: UserRole.LOCAL_ADM,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const normalUser = await connection.collection('users').insertOne({
    matricula: `HF${currentYear}0004`,
    nome: 'Usuario',
    sobrenome: 'Comum',
    cpf: '00000000004',
    email: 'user@homensdefe.com.br',
    password: hashedPassword,
    dataNascimento: new Date('1995-01-01'),
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Users created with matriculas (Senhas: 123456).');

  // 2. Initialize Counter
  await connection.collection('counters').insertOne({
    name: 'user_matricula',
    seq: 4,
  });
  console.log('✅ Counter initialized at 4.');

  // 3. Create Global Quem Somos (Settings)
  await connection.collection('settings').insertOne({
    key: 'quemSomosGeral',
    value: 'O movimento Homens de Fé atua em âmbito nacional para resgatar os valores da família e fortalecer os laços de irmandade. Cremos no poder da oração e na ação transformadora através de nossos encontros e retiros, que hoje já alcançam múltiplas regiões do Brasil.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Create Cities
  const pelotas = await connection.collection('cities').insertOne({
    nome: 'Pelotas',
    uf: 'RS',
    slug: 'pelotas',
    status: CityStatus.ACTIVE,
    adminLocalRefs: [localAdmPelotas.insertedId],
    quemSomosLocal: 'Em Pelotas, o movimento nasceu na Matriz central e se expandiu para diversas paróquias.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const poa = await connection.collection('cities').insertOne({
    nome: 'Porto Alegre',
    uf: 'RS',
    slug: 'porto-alegre',
    status: CityStatus.ACTIVE,
    adminLocalRefs: [localAdmPoa.insertedId],
    quemSomosLocal: 'O polo de Porto Alegre é um dos mais enérgicos do Estado.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 5. News
  await connection.collection('news').insertMany([
    {
      titulo: 'Homens de Fé alcança novo marco',
      slug: 'marco-inscricoes',
      conteudo: 'Mais de 5.000 homens já participaram dos nossos retiros.',
      cityRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);

  console.log('🎉 Expanded seed completed successfully!');
  await app.close();
}

bootstrap();
