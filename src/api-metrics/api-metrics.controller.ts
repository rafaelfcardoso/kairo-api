import {
  Controller,
  Get,
  Query,
  UseGuards,
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ApiMetricsService } from './api-metrics.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiMetrics } from '../entities/api-metrics.entity';

/**
 * Custom pipe to parse date strings into Date objects
 */
@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string, metadata: ArgumentMetadata): Date {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new BadRequestException(
        `${metadata.data} must be a valid date string (YYYY-MM-DD)`,
      );
    }
    return date;
  }
}

@ApiTags('API Metrics')
@Controller('admin/api-metrics')
@UseGuards(AuthGuard('jwt'))
export class ApiMetricsController {
  constructor(private apiMetricsService: ApiMetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Get API metrics for a specific time period' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date for metrics (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date for metrics (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endpoint',
    required: false,
    description: 'Filter by specific endpoint',
  })
  @ApiQuery({
    name: 'method',
    required: false,
    description: 'Filter by HTTP method (GET, POST, etc.)',
  })
  @ApiQuery({
    name: 'version',
    required: false,
    description: 'Filter by API version',
  })
  async getMetrics(
    @Query('startDate', ParseDatePipe) startDate: Date,
    @Query('endDate', ParseDatePipe) endDate: Date,
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
    @Query('version') version?: string,
  ): Promise<ApiMetrics[]> {
    return this.apiMetricsService.getMetrics(
      startDate,
      endDate,
      endpoint,
      method,
      version,
    );
  }
}
