import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Root endpoint' })
  getHello(): string {
    return 'Zenith API is running!';
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  async healthCheck() {
    const dbStatus = this.dataSource.isInitialized
      ? 'connected'
      : 'disconnected';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      database: {
        status: dbStatus,
      },
    };
  }
}
