import { Module, Logger } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CitiesModule } from './cities/cities.module';
import { FirebaseModule } from './firebase/firebase.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { NewsModule } from './news/news.module';
import { SettingsModule } from './settings/settings.module';
import { EventsModule } from './events/events.module';
import { MailModule } from './mail/mail.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'homologacao' ? '.env.homologacao' : '.env.dev',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGO_URI');
        const logger = new Logger('MongoConnection');
        
        if (uri) {
          const dbName = uri.split('/').pop()?.split('?')[0];
          logger.log(`Conectando ao MongoDB: ${dbName}`);
        } else {
          logger.error('MONGO_URI não encontrada nas variáveis de ambiente!');
        }
        
        return { uri };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,  // janela de 60 segundos
      limit: 20,   // máx 20 requests por janela por IP
    }]),
    CitiesModule,
    FirebaseModule,
    UsersModule,
    AuthModule,
    NewsModule,
    SettingsModule,
    EventsModule,
    MailModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // Rate limiting global
  ],
})
export class AppModule {}
