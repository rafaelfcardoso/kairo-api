import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { TimeFilterDto, UserStatsResponseDto } from './stats.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { User } from '../entities/user.entity';

@ApiTags('Statistics')
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: "Get authenticated user's productivity statistics" })
  @ApiResponse({
    status: 200,
    description: 'User productivity statistics',
    type: UserStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
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
    @Query() filterDto: TimeFilterDto,
    @Req() request: Request,
  ): Promise<UserStatsResponseDto> {
    const userId = (request.user as User).id;
    return this.statsService.getUserStats(userId, filterDto);
  }
}
