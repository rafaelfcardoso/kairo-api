import { ApiProperty } from '@nestjs/swagger';

export class DailyStatsDto {
  @ApiProperty({
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2025-02-26',
  })
  date: string;

  @ApiProperty({
    description: 'Total minutes worked on this date',
    example: 240,
  })
  minutes: number;
}

export class HourlyStatsDto {
  @ApiProperty({
    description: 'Hour of the day (0-23)',
    example: 9,
  })
  hour: number;

  @ApiProperty({
    description: 'Total minutes worked in this hour',
    example: 60,
  })
  minutes: number;
}

export class ProjectTimeDto {
  @ApiProperty({
    description: 'Project unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  projectId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Project A',
  })
  name: string;

  @ApiProperty({
    description: 'Total minutes worked on this project',
    example: 600,
  })
  minutes: number;
}

export class DailySessionCountDto {
  @ApiProperty({
    description: 'Date in ISO format (YYYY-MM-DD)',
    example: '2025-02-26',
  })
  date: string;

  @ApiProperty({
    description: 'Number of focus sessions completed on this date',
    example: 4,
  })
  count: number;
}

export class UserStatsResponseDto {
  @ApiProperty({
    description: 'Total minutes worked by day for the selected period',
    type: [DailyStatsDto],
  })
  minutesWorkedByDay: DailyStatsDto[];

  @ApiProperty({
    description:
      'Total minutes worked by hour for a specific day (when applicable)',
    type: [HourlyStatsDto],
    required: false,
  })
  minutesWorkedByHour?: HourlyStatsDto[];

  @ApiProperty({
    description:
      'Average time worked per day for the current week (in minutes)',
    example: 180,
  })
  averageTimeWorkedByDayForWeek: number;

  @ApiProperty({
    description:
      'Total minutes worked per hour of day across the selected period',
    type: [HourlyStatsDto],
  })
  hourlyActivity: HourlyStatsDto[];

  @ApiProperty({
    description: 'Total time spent on each project within the selected period',
    type: [ProjectTimeDto],
  })
  totalTimeByProject: ProjectTimeDto[];

  @ApiProperty({
    description:
      'Number of focus sessions completed each day within the selected period',
    type: [DailySessionCountDto],
  })
  focusSessionsPerDay: DailySessionCountDto[];

  @ApiProperty({
    description:
      'Average duration of focus sessions within the selected period (in minutes)',
    example: 25,
  })
  averageFocusSessionDuration: number;
}

export class TimeFilterDto {
  @ApiProperty({
    description: 'Filter type for time period',
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
    example: 'weekly',
  })
  filter:
    | 'daily'
    | 'last7days'
    | 'weekly'
    | 'last30days'
    | 'monthly'
    | 'yearly'
    | 'alltime'
    | 'custom';

  @ApiProperty({
    description: 'Start date for custom filter (ISO format)',
    example: '2025-01-01',
    required: false,
  })
  startDate?: string;

  @ApiProperty({
    description: 'End date for custom filter (ISO format)',
    example: '2025-01-31',
    required: false,
  })
  endDate?: string;

  @ApiProperty({
    description: 'Specific day for hourly breakdown (ISO format)',
    example: '2025-02-26',
    required: false,
  })
  day?: string;
}
