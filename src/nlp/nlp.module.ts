import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NlpController } from './nlp.controller';
import { NlpService } from './nlp.service';
import { AiModule } from '../common/services/ai.module';
import { TasksModule } from '../tasks/tasks.module';
import { ProjectsModule } from '../projects/projects.module';
import { TagsModule } from '../tags/tags.module';
import { NlpFeedback } from './entities/nlp-feedback.entity';
import { NlpModelPerformance } from './entities/model-performance.entity';
import { AbTestingService } from './services/ab-testing.service';
import { AbTestingController } from './controllers/ab-testing.controller';

/**
 * Module for natural language processing capabilities
 * Provides services for task parsing, entity extraction, and query understanding
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([NlpFeedback, NlpModelPerformance]),
    AiModule,
    TasksModule,
    ProjectsModule,
    TagsModule,
  ],
  controllers: [NlpController, AbTestingController],
  providers: [NlpService, AbTestingService],
  exports: [NlpService, AbTestingService],
})
export class NlpModule {}
