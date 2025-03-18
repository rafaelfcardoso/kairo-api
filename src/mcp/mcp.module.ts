import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { TasksModule } from '../tasks/tasks.module';
import { TagsModule } from '../tags/tags.module';
import { AiModule } from '../common/services/ai.module';
import { ProjectsModule } from '../projects/projects.module';
import { ApiVersionInterceptor } from './interceptors/api-version.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';

@Module({
  imports: [TasksModule, TagsModule, AiModule, ProjectsModule],
  controllers: [McpController],
  providers: [McpService, ApiVersionInterceptor, HttpExceptionFilter],
  exports: [McpService],
})
export class McpModule {}
