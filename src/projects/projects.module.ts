import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project } from './projects.entity';
import { ProjectsRepository } from './projects.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { ModuleRef } from '@nestjs/core';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository, TasksRepository],
  exports: [ProjectsService],
})
export class ProjectsModule implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  async onModuleInit() {
    const projectsRepository = this.moduleRef.get(ProjectsRepository);

    // Check if Inbox project exists
    const inboxProject = await projectsRepository.findOne({
      where: { id: '569c363f-1934-4e69-b324-6c2fad28bc59' },
    });

    if (!inboxProject) {
      // Create the Inbox project if it doesn't exist
      await projectsRepository.save({
        id: '569c363f-1934-4e69-b324-6c2fad28bc59',
        name: 'Caixa de entrada',
        description: 'Tarefas não atribuídas a projetos',
        isSystem: true,
        color: '#808080',
      });

      console.log('Created system Inbox project');
    }
  }
}
