import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../../tasks/tasks.entity';
import { SchedulerService } from './scheduler.service';
import { TasksModule } from '../../tasks/tasks.module';
import { NotificationModule } from './notification.module';

/**
 * SchedulerModule handles the scheduling and execution of tasks.
 * It integrates with the Task entity and uses the TasksRepository for data access.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Task]),
    TasksModule,
    NotificationModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
