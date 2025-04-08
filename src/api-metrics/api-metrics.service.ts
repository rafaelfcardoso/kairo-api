import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  QueryRunnerAlreadyReleasedError,
} from 'typeorm';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { Request, Response } from 'express';

// Define ApiErrorCode enum locally
export enum ApiErrorCode {
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Action errors
  ACTION_NOT_FOUND = 'ACTION_NOT_FOUND',
  ACTION_FAILED = 'ACTION_FAILED',

  // Service errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
}

@Injectable()
export class ApiMetricsService implements OnApplicationShutdown {
  private readonly logger = new Logger(ApiMetricsService.name);
  private isShuttingDown = false;

  constructor(
    @InjectRepository(ApiRequestLog)
    private apiRequestLogRepository: Repository<ApiRequestLog>,
    @InjectRepository(ApiMetrics)
    private apiMetricsRepository: Repository<ApiMetrics>,
    private dataSource: DataSource,
  ) {}

  async onApplicationShutdown() {
    this.isShuttingDown = true;
    // No need to close connections here as they are managed by the app
  }

  /**
   * Log an API request with its details
   */
  async logApiRequest(
    request: Request,
    response: Response,
    startTime: number,
    responseSize?: number,
    errorCode?: ApiErrorCode | string,
  ): Promise<void> {
    try {
      // Don't log if shutting down or in test environment with closed connection
      if (
        this.isShuttingDown ||
        (process.env.NODE_ENV === 'test' && !this.dataSource.isInitialized)
      ) {
        return;
      }

      const endTime = Date.now();
      // Calculate response time in milliseconds and ensure it's within PostgreSQL integer range
      const responseTime = Math.min(endTime - startTime, 2147483647);

      // Extract needed data
      const endpoint = request.route?.path || request.path;
      const method = request.method;
      const statusCode = response.statusCode;
      const version = response.getHeader('X-API-Version')?.toString() || '1.0';
      const userId = (request as any).user?.id;

      // Create log entry
      const requestLog = this.apiRequestLogRepository.create({
        endpoint,
        method,
        version,
        statusCode,
        responseTime,
        userId,
        userAgent: request.headers['user-agent'],
        ipAddress: request.ip,
        requestBody: method !== 'GET' ? request.body : null,
        requestQuery: request.query,
        responseSize,
        errorCode: errorCode?.toString(),
      });

      await this.apiRequestLogRepository.save(requestLog);

      // Update aggregated metrics
      await this.updateMetrics(
        endpoint,
        method,
        version,
        statusCode,
        responseTime,
      );
    } catch (error) {
      // Catch errors during request logging
      if (
        error instanceof QueryRunnerAlreadyReleasedError ||
        error.message?.includes('Driver not Connected') ||
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Cannot use a pool after calling end') ||
        error.code === 'ECONNRESET'
      ) {
        this.logger.warn(
          `Failed to log API request (connection likely closed/released during shutdown): ${error.message}`,
        );
      } else {
        this.logger.error(
          `Failed to log API request: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Update aggregated metrics for an endpoint
   */
  async updateMetrics(
    endpoint: string,
    method: string,
    version: string,
    statusCode: number,
    responseTime: number,
  ): Promise<void> {
    // Don't update if shutting down or connection closed
    if (this.isShuttingDown || !this.dataSource.isInitialized) {
      return;
    }
    await this.apiMetricsRepository.manager.transaction(
      async (transactionalEntityManager) => {
        try {
          let metrics = await transactionalEntityManager.findOne(ApiMetrics, {
            where: { endpoint, method, version },
            lock: { mode: 'pessimistic_write' },
          });

          if (!metrics) {
            metrics = this.apiMetricsRepository.create({
              endpoint,
              method,
              version,
              date: new Date(),
              hour: new Date().getHours(),
              requestCount: 0,
              successCount: 0,
              errorCount: 0,
              avgResponseTime: 0,
              minResponseTime: responseTime,
              maxResponseTime: responseTime,
            });
          }

          // Update metrics
          metrics.requestCount += 1;
          if (statusCode >= 200 && statusCode < 400) {
            metrics.successCount += 1;
          } else {
            metrics.errorCount += 1;
          }

          // Update response time statistics
          const oldTotal = metrics.avgResponseTime * (metrics.requestCount - 1);
          metrics.avgResponseTime =
            (oldTotal + responseTime) / metrics.requestCount;

          if (
            metrics.minResponseTime === null ||
            responseTime < metrics.minResponseTime
          ) {
            metrics.minResponseTime = responseTime;
          }
          if (
            metrics.maxResponseTime === null ||
            responseTime > metrics.maxResponseTime
          ) {
            metrics.maxResponseTime = responseTime;
          }

          // Save updated/new metrics
          await transactionalEntityManager.save(ApiMetrics, metrics);
        } catch (error) {
          // Catch errors during metric update
          if (
            error instanceof QueryRunnerAlreadyReleasedError ||
            error.message?.includes('Driver not Connected') ||
            error.message?.includes('Connection terminated') ||
            error.message?.includes('Connection is closed') ||
            error.message?.includes('Cannot use a pool after calling end')
          ) {
            this.logger.warn(
              `Failed to update API metrics (connection likely closed/released during shutdown): ${error.message}`,
            );
          } else {
            this.logger.error(
              `Failed to update API metrics: ${error.message}`,
              error.stack,
            );
            throw error;
          }
        }
      },
    );
  }

  /**
   * Get metrics for a specific time period
   */
  async getMetrics(
    startDate: Date,
    endDate: Date,
    endpoint?: string,
    method?: string,
    version?: string,
  ): Promise<ApiMetrics[]> {
    const query = this.apiMetricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.date >= :startDate', { startDate })
      .andWhere('metrics.date <= :endDate', { endDate })
      .orderBy('metrics.date', 'ASC')
      .addOrderBy('metrics.hour', 'ASC');

    if (endpoint) {
      query.andWhere('metrics.endpoint = :endpoint', { endpoint });
    }

    if (method) {
      query.andWhere('metrics.method = :method', { method });
    }

    if (version) {
      query.andWhere('metrics.version = :version', { version });
    }

    return query.getMany();
  }
}
