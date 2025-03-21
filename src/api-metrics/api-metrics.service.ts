import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiRequestLog, ApiMetrics } from '../entities/api-metrics.entity';
import { Request, Response } from 'express';
import { ApiErrorCode } from '../mcp/mcp.types';

@Injectable()
export class ApiMetricsService {
  private readonly logger = new Logger(ApiMetricsService.name);

  constructor(
    @InjectRepository(ApiRequestLog)
    private apiRequestLogRepository: Repository<ApiRequestLog>,
    @InjectRepository(ApiMetrics)
    private apiMetricsRepository: Repository<ApiMetrics>,
  ) {}

  /**
   * Log an API request with its details
   */
  async logApiRequest(
    request: Request,
    response: Response,
    responseTime: number,
    responseSize?: number,
    errorCode?: ApiErrorCode | string,
  ): Promise<void> {
    try {
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
      // Don't fail the request if metrics logging fails
      this.logger.error(
        `Failed to log API request: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Update aggregated metrics for an endpoint
   */
  private async updateMetrics(
    endpoint: string,
    method: string,
    version: string,
    statusCode: number,
    responseTime: number,
  ): Promise<void> {
    try {
      const now = new Date();
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hour = now.getHours();

      // Use a transaction with serializable isolation to prevent race conditions
      await this.apiMetricsRepository.manager.transaction(
        async (transactionalEntityManager) => {
          // Find or create metrics record with a SELECT FOR UPDATE lock
          let metrics = await transactionalEntityManager
            .createQueryBuilder(ApiMetrics, 'metrics')
            .setLock('pessimistic_write')
            .where('metrics.endpoint = :endpoint', { endpoint })
            .andWhere('metrics.method = :method', { method })
            .andWhere('metrics.version = :version', { version })
            .andWhere('metrics.date = :date', { date })
            .andWhere('metrics.hour = :hour', { hour })
            .getOne();

          if (!metrics) {
            metrics = this.apiMetricsRepository.create({
              endpoint,
              method,
              version,
              date,
              hour,
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

          // Save updated metrics within the transaction
          await transactionalEntityManager.save(metrics);
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update API metrics: ${error.message}`,
        error.stack,
      );
      // Continue execution - metrics error shouldn't affect main functionality
    }
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
