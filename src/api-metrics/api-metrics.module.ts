import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiMetricsService } from './api-metrics.service';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { ApiMetricsController } from './api-metrics.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ApiRequestLog, ApiMetrics])],
  controllers: [ApiMetricsController],
  providers: [ApiMetricsService],
  exports: [ApiMetricsService],
})
export class ApiMetricsModule {}
