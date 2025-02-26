// src/focus-sessions/focus-sessions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FocusSessionsController } from './focus-sessions.controller';
import { FocusSessionsService } from './focus-sessions.service';
import { FocusSessionsRepository } from './focus-sessions.repository';
import { FocusSession } from './focus-sessions.entity';
import { Task } from '../tasks/tasks.entity';
import { Project } from '../projects/projects.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FocusSession, Task, Project])],
  controllers: [FocusSessionsController],
  providers: [FocusSessionsService, FocusSessionsRepository],
  exports: [FocusSessionsService],
})
export class FocusSessionsModule {}
