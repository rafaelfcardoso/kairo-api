// src/modules/task.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskService } from './tasks.service';
import { TaskController } from './tasks.controller';
import { TaskRepository } from './tasks.repository';
import { ProjectRepository } from '../projects/projects.repository';
import { TagRepository } from '../tags/tags.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskRepository,
      ProjectRepository,
      TagRepository,
    ]),
  ],
  controllers: [TaskController],
  providers: [TaskService],
  exports: [TaskService],
})
export class TaskModule {}
