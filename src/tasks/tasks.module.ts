// src/modules/task.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './tasks.service';
import { TaskController } from './tasks.controller';
import { Task } from './tasks.entity';
import { TasksRepository } from './tasks.repository';
import { ProjectsRepository } from '../projects/projects.repository';
import { TagsRepository } from '../tags/tags.repository';
import { SecurityLoggerService } from '../common/services/security-logger.service';
import { AiModule } from '../common/services/ai.module';
import { TaskDomainService } from './tasks.domain.service';
import { TaskFactory } from './factories/task.factory';
import { NotificationDomainService } from './notification.domain.service';
import { TaskAggregate } from './aggregates/task.aggregate';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), AiModule],
  controllers: [TaskController],
  providers: [
    TaskService,
    TasksRepository,
    ProjectsRepository,
    TagsRepository,
    SecurityLoggerService,
    TaskDomainService,
    TaskFactory,
    NotificationDomainService,
  ],
  exports: [
    TaskService,
    TasksRepository,
    TaskDomainService,
    TaskFactory,
    NotificationDomainService,
  ],
})
export class TasksModule {}
