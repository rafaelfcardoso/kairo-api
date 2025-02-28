import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../tasks/tasks.entity';
import { SchedulerService } from './scheduler.service';
import { AiModule } from './ai.module';
import { TaskDomainService } from '../../tasks/tasks.domain.service';
import { TasksRepository } from '../../tasks/tasks.repository';

/**
 * SchedulerModule handles the scheduling and execution of tasks.
 * It integrates with the Task entity and uses the TasksRepository for data access.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task]),
    AiModule,
  ],
  providers: [SchedulerService, TaskDomainService, TasksRepository],
  exports: [SchedulerService],
})
export class SchedulerModule {}
