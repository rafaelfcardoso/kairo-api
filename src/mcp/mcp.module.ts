import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { TasksModule } from '../tasks/tasks.module';
import { AiModule } from '../common/services/ai.module';

@Module({
  imports: [TasksModule, AiModule],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
