import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIServiceImpl } from '../../services/ai.service.impl';
import { AIAnalysisRepository } from '../../repositories/ai.repository';
import { AISuggestionRepository } from '../../repositories/ai.repository';
import { AIActionRepository } from '../../repositories/ai.repository';
import { AISystemDiagnosticRepository } from '../../repositories/ai.repository';
import { AIAnalysis } from '../../entities/ai/AIAnalysis.entity';
import { AISuggestion } from '../../entities/ai/AISuggestion.entity';
import { AIAction } from '../../entities/ai/AIAction.entity';
import { AISystemDiagnostic } from '../../entities/ai/AISystemDiagnostic.entity';
import { RedisModule } from '../redis/redis.module';
import { KafkaModule } from '../kafka/kafka.module';
import { AIController } from '../../controllers/ai.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIAnalysis,
      AISuggestion,
      AIAction,
      AISystemDiagnostic
    ]),
    RedisModule,
    KafkaModule
  ],
  controllers: [AIController],
  providers: [
    AIServiceImpl,
    AIAnalysisRepository,
    AISuggestionRepository,
    AIActionRepository,
    AISystemDiagnosticRepository
  ],
  exports: [AIServiceImpl]
})
export class AIModule {}