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
  @ApiTags('App')
  @ApiOperation({ summary: 'Root endpoint' })
  getHello(): string {
    return 'Zenith API is running!';
  }

  @Get('health')
  @ApiOperation({ summary: 'API Health and Status' })
  @ApiResponse({
    status: 200,
    description: 'Application health and status information',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        status: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' },
        environment: { type: 'string' },
        version: { type: 'string' },
        uptime: { type: 'number' },
        documentation: { type: 'string' },
        memoryUsage: {
          type: 'object',
          properties: {
            heapTotal: { type: 'number' },
            heapUsed: { type: 'number' },
            rss: { type: 'number' },
          },
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string' },
          },
        },
      },
    },
  })
  async healthCheck() {
    const baseUrl =
      this.configService.get('api.url') || 'http://localhost:3001';
    const dbStatus = this.dataSource.isInitialized
      ? 'connected'
      : 'disconnected';

    return {
      name: 'Zenith API',
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('nodeEnv') || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      documentation: `${baseUrl}/api`,
      memoryUsage: process.memoryUsage(),
      database: {
        status: dbStatus,
      },
    };
  }
}
