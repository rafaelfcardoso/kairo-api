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
  @ApiOperation({ summary: 'Basic API Health Status (Legacy)' })
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
        note: { type: 'string' },
        enhancedEndpoints: {
          type: 'object',
          properties: {
            overall: { type: 'string' },
            detailed: { type: 'string' },
            database: { type: 'string' },
            memory: { type: 'string' },
            disk: { type: 'string' },
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
      note: 'This is a legacy health endpoint. Please use the enhanced health endpoints for more detailed information.',
      enhancedEndpoints: {
        overall: `${baseUrl}/api/v1/system-health`,
        detailed: `${baseUrl}/api/v1/system-health/detailed`,
        database: `${baseUrl}/api/v1/system-health/db`,
        memory: `${baseUrl}/api/v1/system-health/memory`,
        disk: `${baseUrl}/api/v1/system-health/disk`,
      },
      database: {
        status: dbStatus,
      },
    };
  }
}
