import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AIModule } from './modules/ai/ai.module';
import { RedisModule } from './modules/redis/redis.module';
import { KafkaModule } from './modules/kafka/kafka.module';
import { AIAnalysis } from './entities/ai/AIAnalysis.entity';
import { AISuggestion } from './entities/ai/AISuggestion.entity';
import { AIAction } from './entities/ai/AIAction.entity';
import { AISystemDiagnostic } from './entities/ai/AISystemDiagnostic.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'admin_ai',
      entities: [
        AIAnalysis,
        AISuggestion,
        AIAction,
        AISystemDiagnostic
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV !== 'production'
    }),
    AIModule,
    RedisModule,
    KafkaModule
  ]
})
export class AppModule {} 