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

  // 1. Create Users
  const superAdm = await connection.collection('users').insertOne({
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

  console.log('✅ Users created (Senhas: 123456).');

  // 2. Create Global Quem Somos (Settings)
  await connection.collection('settings').insertOne({
    key: 'quemSomosGeral',
    value: 'O movimento Homens de Fé atua em âmbito nacional para resgatar os valores da família e fortalecer os laços de irmandade. Cremos no poder da oração e na ação transformadora através de nossos encontros e retiros, que hoje já alcançam múltiplas regiões do Brasil.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Global Quem Somos created.');

  // 3. Create Cities
  const pelotas = await connection.collection('cities').insertOne({
    nome: 'Pelotas',
    uf: 'RS',
    slug: 'pelotas',
    status: CityStatus.ACTIVE,
    adminLocalRefs: [localAdmPelotas.insertedId],
    quemSomosLocal: 'Em Pelotas, o movimento nasceu na Matriz central e se expandiu para diversas paróquias. Nosso foco é oferecer suporte contínuo através de nossos terços mensais e retiros anuais, acolhendo homens de todas as idades para o crescimento cristão.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const poa = await connection.collection('cities').insertOne({
    nome: 'Porto Alegre',
    uf: 'RS',
    slug: 'porto-alegre',
    status: CityStatus.ACTIVE,
    adminLocalRefs: [localAdmPoa.insertedId],
    quemSomosLocal: 'O polo de Porto Alegre é um dos mais enérgicos do Estado. Com atuação nas periferias e centro, os Homens de Fé da capital unem forças para grandes ações de caridade e encontros de aprofundamento filosófico e espiritual.',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('✅ Cities (Pelotas, Porto Alegre) created.');

  // 4. Create News (Global and Local)
  await connection.collection('news').insertMany([
    // Global
    {
      titulo: 'Homens de Fé alcança novo marco de inscrições nacionais',
      slug: 'marco-inscricoes-nacionais',
      conteudo: 'É com grande alegria que anunciamos que mais de 5.000 homens já participaram dos nossos retiros oficiais ao longo desta última década no Brasil.',
      cityRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Pelotas
    {
      titulo: 'Grupo base de Pelotas organiza arrecadação de roupas',
      slug: 'pelotas-arrecadacao-roupas',
      conteudo: 'Aproveitando o inverno, nossos irmãos de Pelotas darão início à campanha do agasalho neste fim de semana.',
      cityRef: pelotas.insertedId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // POA
    {
      titulo: 'Retiro urbano em Porto Alegre é um sucesso',
      slug: 'poa-retiro-urbano-sucesso',
      conteudo: 'Diferente dos tradicionais retiros isolados, o polo de POA realizou um grande retiro no centro histórico batendo recorde de público.',
      cityRef: poa.insertedId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);

  console.log('✅ Global and Local News created.');

  // 5. Create Events (Global and Local)
  await connection.collection('events').insertMany([
    // Global
    {
      titulo: 'Vigília Nacional Online',
      data: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Em 10 dias
      local: 'Transmissão Ao Vivo (YouTube)',
      descricao: 'Uma noite de louvor e adoração transmitida para todos os polos simultaneamente.',
      limiteVagas: 10000,
      isActive: true,
      cityRef: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Pelotas
    {
      titulo: 'Retiro Renascer - Pelotas 2026',
      data: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // Em 20 dias
      local: 'Recanto Santo Agostinho (Zona Rural)',
      descricao: 'Nosso tradicional retiro de 3 dias de imersão total.',
      limiteVagas: 80,
      isActive: true,
      cityRef: pelotas.insertedId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // POA
    {
      titulo: 'Simpósio Liderança Cristã - POA',
      data: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Em 15 dias
      local: 'Centro de Eventos FIERGS',
      descricao: 'Encontro destinado à formação de novas lideranças e coordenadores para o movimento na capital.',
      limiteVagas: 300,
      isActive: true,
      cityRef: poa.insertedId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]);

  console.log('✅ Global and Local Events created.');

  console.log('🎉 Expanded seed completed successfully!');
  await app.close();
}

bootstrap();
