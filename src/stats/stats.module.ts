import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { Project } from '../projects/projects.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([FocusSession, Project]),
    CacheModule.register({
      ttl: 60 * 15, // Cache for 15 minutes
      max: 100, // Maximum number of items in cache
    }),
  ],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
