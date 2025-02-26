// src/stats/stats.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FocusSession } from '../focus-sessions/focus-sessions.entity';
import { Project } from '../projects/projects.entity';
import {
  DailyStatsDto,
  HourlyStatsDto,
  ProjectTimeDto,
  DailySessionCountDto,
  UserStatsResponseDto,
  TimeFilterDto,
} from './stats.dto';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  format,
} from 'date-fns';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(FocusSession)
    private focusSessionRepository: Repository<FocusSession>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get all user statistics based on the provided filter
   */
  async getUserStats(
    userId: string,
    filter: TimeFilterDto,
  ): Promise<UserStatsResponseDto> {
    try {
      // Generate cache key based on user and filter parameters
      const cacheKey = this.generateCacheKey(userId, filter);

      // Try to get data from cache first
      const cachedData =
        await this.cacheManager.get<UserStatsResponseDto>(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return cachedData;
      }

      this.logger.debug(
        `Cache miss for key: ${cacheKey}, calculating stats...`,
      );

      // Calculate date range based on filter
      const { startDate, endDate } = this.calculateDateRange(filter);

      // Get all necessary stats
      const [
        minutesWorkedByDay,
        hourlyActivity,
        totalTimeByProject,
        focusSessionsPerDay,
        averageFocusSessionDuration,
        averageTimeWorkedByDayForWeek,
        minutesWorkedByHour,
      ] = await Promise.all([
        this.calculateMinutesWorkedByDay(userId, startDate, endDate),
        this.calculateHourlyActivity(userId, startDate, endDate),
        this.calculateTotalTimeByProject(userId, startDate, endDate),
        this.calculateFocusSessionsPerDay(userId, startDate, endDate),
        this.calculateAverageFocusSessionDuration(userId, startDate, endDate),
        this.calculateAverageTimeWorkedByDayForWeek(userId),
        filter.day
          ? this.calculateMinutesWorkedByHour(userId, parseISO(filter.day))
          : null,
      ]);

      const result = {
        minutesWorkedByDay,
        minutesWorkedByHour,
        averageTimeWorkedByDayForWeek,
        hourlyActivity,
        totalTimeByProject,
        focusSessionsPerDay,
        averageFocusSessionDuration,
      };

      // Cache the result
      // Set cache TTL based on filter type (shorter for daily, longer for yearly)
      const ttl = this.getCacheTtlForFilter(filter);
      await this.cacheManager.set(cacheKey, result, ttl);

      return result;
    } catch (error) {
      this.logger.error(
        `Error calculating user stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate a unique cache key based on parameters
   */
  private generateCacheKey(userId: string, filter: TimeFilterDto): string {
    const base = `user-stats:${userId}:${filter.filter}`;

    if (filter.filter === 'custom') {
      return `${base}:${filter.startDate}-${filter.endDate}`;
    }

    if (filter.day) {
      return `${base}:day-${filter.day}`;
    }

    return base;
  }

  /**
   * Get appropriate cache TTL based on filter type
   */
  private getCacheTtlForFilter(filter: TimeFilterDto): number {
    switch (filter.filter) {
      case 'daily':
        return 60 * 5; // 5 minutes for daily stats (more likely to change)
      case 'last7days':
      case 'weekly':
        return 60 * 15; // 15 minutes for weekly stats
      case 'last30days':
      case 'monthly':
        return 60 * 30; // 30 minutes for monthly stats
      case 'yearly':
      case 'alltime':
        return 60 * 60; // 1 hour for yearly or all-time stats (less likely to change)
      case 'custom':
        return 60 * 15; // 15 minutes for custom range
      default:
        return 60 * 15; // Default to 15 minutes
    }
  }

  /**
   * Calculate appropriate date range based on filter type
   */
  private calculateDateRange(filter: TimeFilterDto): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();

    switch (filter.filter) {
      case 'daily':
        return {
          startDate: startOfDay(now),
          endDate: endOfDay(now),
        };
      case 'last7days':
        return {
          startDate: startOfDay(subDays(now, 6)),
          endDate: endOfDay(now),
        };
      case 'weekly':
        return {
          startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
          endDate: endOfWeek(now, { weekStartsOn: 1 }), // Sunday
        };
      case 'last30days':
        return {
          startDate: startOfDay(subDays(now, 29)),
          endDate: endOfDay(now),
        };
      case 'monthly':
        return {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now),
        };
      case 'yearly':
        return {
          startDate: startOfYear(now),
          endDate: endOfYear(now),
        };
      case 'alltime':
        return {
          startDate: new Date(0), // Beginning of time
          endDate: now,
        };
      case 'custom':
        if (!filter.startDate || !filter.endDate) {
          throw new Error('Custom filter requires both startDate and endDate');
        }
        return {
          startDate: startOfDay(parseISO(filter.startDate)),
          endDate: endOfDay(parseISO(filter.endDate)),
        };
      default:
        throw new Error(`Unknown filter type: ${filter.filter}`);
    }
  }

  /**
   * Calculate total minutes worked by day within a date range
   */
  private async calculateMinutesWorkedByDay(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyStatsDto[]> {
    const focusSessions = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('DATE(session.startTime)', 'date')
      .addSelect('SUM(session.durationMinutes)', 'minutes')
      .where('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(session.startTime)')
      .orderBy('DATE(session.startTime)', 'ASC')
      .getRawMany();

    return focusSessions.map((session) => ({
      date: format(new Date(session.date), 'yyyy-MM-dd'),
      minutes: parseInt(session.minutes, 10) || 0,
    }));
  }

  /**
   * Calculate minutes worked by hour for a specific day
   */
  private async calculateMinutesWorkedByHour(
    userId: string,
    day: Date,
  ): Promise<HourlyStatsDto[]> {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);

    const hourlyData = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('EXTRACT(HOUR FROM session.startTime)', 'hour')
      .addSelect('SUM(session.durationMinutes)', 'minutes')
      .where('session.startTime BETWEEN :dayStart AND :dayEnd', {
        dayStart,
        dayEnd,
      })
      .groupBy('EXTRACT(HOUR FROM session.startTime)')
      .orderBy('EXTRACT(HOUR FROM session.startTime)', 'ASC')
      .getRawMany();

    // Ensure all 24 hours are represented
    const hourlyStats: HourlyStatsDto[] = Array.from(
      { length: 24 },
      (_, i) => ({
        hour: i,
        minutes: 0,
      }),
    );

    // Fill in the actual data
    hourlyData.forEach((data) => {
      const hour = parseInt(data.hour, 10);
      hourlyStats[hour].minutes = parseInt(data.minutes, 10) || 0;
    });

    return hourlyStats;
  }

  /**
   * Calculate average time worked per day in the current week
   */
  private async calculateAverageTimeWorkedByDayForWeek(
    userId: string,
  ): Promise<number> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    const result = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('AVG(daily_total.total_minutes)', 'average')
      .from((subQuery) => {
        return subQuery
          .select('DATE(session.startTime)', 'day')
          .addSelect('SUM(session.durationMinutes)', 'total_minutes')
          .from(FocusSession, 'session')
          .where('session.startTime BETWEEN :weekStart AND :weekEnd', {
            weekStart,
            weekEnd,
          })
          .groupBy('DATE(session.startTime)');
      }, 'daily_total')
      .getRawOne();

    return Math.round(result?.average || 0);
  }

  /**
   * Calculate hourly activity pattern (minutes worked per hour of day)
   */
  private async calculateHourlyActivity(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<HourlyStatsDto[]> {
    const hourlyActivity = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('EXTRACT(HOUR FROM session.startTime)', 'hour')
      .addSelect('SUM(session.durationMinutes)', 'minutes')
      .where('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('EXTRACT(HOUR FROM session.startTime)')
      .orderBy('EXTRACT(HOUR FROM session.startTime)', 'ASC')
      .getRawMany();

    // Ensure all 24 hours are represented
    const hourlyStats: HourlyStatsDto[] = Array.from(
      { length: 24 },
      (_, i) => ({
        hour: i,
        minutes: 0,
      }),
    );

    // Fill in the actual data
    hourlyActivity.forEach((activity) => {
      const hour = parseInt(activity.hour, 10);
      hourlyStats[hour].minutes = parseInt(activity.minutes, 10) || 0;
    });

    return hourlyStats;
  }

  /**
   * Calculate total time spent per project
   */
  private async calculateTotalTimeByProject(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProjectTimeDto[]> {
    // Get time directly assigned to projects
    const projectTimes = await this.focusSessionRepository
      .createQueryBuilder('session')
      .leftJoin('session.project', 'project')
      .select('session.projectId', 'projectId')
      .addSelect('project.name', 'name')
      .addSelect('SUM(session.durationMinutes)', 'minutes')
      .where('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('session.projectId IS NOT NULL')
      .groupBy('session.projectId')
      .addGroupBy('project.name')
      .getRawMany();

    // Convert the raw results to DTOs
    return projectTimes.map((project) => ({
      projectId: project.projectId,
      name: project.name || 'Unknown Project',
      minutes: parseInt(project.minutes, 10) || 0,
    }));
  }

  /**
   * Calculate number of focus sessions per day
   */
  private async calculateFocusSessionsPerDay(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailySessionCountDto[]> {
    const dailySessions = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('DATE(session.startTime)', 'date')
      .addSelect('COUNT(session.id)', 'count')
      .where('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(session.startTime)')
      .orderBy('DATE(session.startTime)', 'ASC')
      .getRawMany();

    return dailySessions.map((day) => ({
      date: format(new Date(day.date), 'yyyy-MM-dd'),
      count: parseInt(day.count, 10) || 0,
    }));
  }

  /**
   * Calculate average focus session duration
   */
  private async calculateAverageFocusSessionDuration(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.focusSessionRepository
      .createQueryBuilder('session')
      .select('AVG(session.durationMinutes)', 'average')
      .where('session.startTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('session.endTime IS NOT NULL') // Only completed sessions
      .getRawOne();

    return Math.round(result?.average || 0);
  }
}
