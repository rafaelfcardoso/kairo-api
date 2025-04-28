import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './projects.entity';
import { ProjectsRepository } from './projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { ModuleRef } from '@nestjs/core';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), CommonModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, TasksRepository],
  exports: [ProjectsService],
})
export class ProjectsModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    // Skip inbox creation check in test environment, rely on migrations
    if (process.env.NODE_ENV === 'test') {
      console.log('[ProjectsModule] Skipping Inbox creation check in test env.');
      return;
    }

    // Removed system Inbox project creation logic
  }
}
