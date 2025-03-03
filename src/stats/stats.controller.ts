import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { TimeFilterDto, UserStatsResponseDto } from './stats.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Statistics')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user productivity statistics' })
  @ApiResponse({
    status: 200,
    description: 'User productivity statistics',
    type: UserStatsResponseDto,
  })
  @ApiParam({
    name: 'userId',
    description: 'The UUID of the user',
    type: 'string',
  })
  @ApiQuery({
    name: 'filter',
    description: 'Time filter type',
    required: true,
    enum: [
      'daily',
      'last7days',
      'weekly',
      'last30days',
      'monthly',
      'yearly',
      'alltime',
      'custom',
    ],
  })
  @ApiQuery({
    name: 'startDate',
    description: 'Start date for custom filter (ISO format)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    description: 'End date for custom filter (ISO format)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'day',
    description: 'Specific day for hourly breakdown (ISO format)',
    required: false,
    type: String,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserStats(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() filterDto: TimeFilterDto,
  ): Promise<UserStatsResponseDto> {
    return this.statsService.getUserStats(userId, filterDto);
  }
}
