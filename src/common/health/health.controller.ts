import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('system-health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get overall health status' })
  @ApiResponse({
    status: 200,
    description: 'Health check passed',
  })
  @ApiResponse({
    status: 503,
    description: 'Health check failed',
  })
  @HealthCheck()
  async check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 250 * 1024 * 1024), // 250MB
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024), // 512MB
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }), // 90% threshold
      () => this.healthService.checkServices(),
    ]);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health and status information' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async getDetailedHealthInfo() {
    return this.healthService.getDetailedHealthInfo();
  }

  @Get('db')
  @ApiOperation({ summary: 'Check database health' })
  @HealthCheck()
  checkDatabase() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('memory')
  @ApiOperation({ summary: 'Check memory usage' })
  @HealthCheck()
  checkMemory() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 250 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @ApiOperation({ summary: 'Check disk usage' })
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () =>
        this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.9 }),
    ]);
  }
}
