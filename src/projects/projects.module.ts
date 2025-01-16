import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectRepository } from './projects.repository';
import { Project } from './projects.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectRepository],
  exports: [ProjectRepository],
})
export class ProjectsModule {} 