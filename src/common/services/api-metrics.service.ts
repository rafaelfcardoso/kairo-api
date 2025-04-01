import { Request, Response } from 'express';
import { ApiRequestLog } from '../entities/api-request-log.entity';
import { ApiMetricsService } from './api-metrics.service';

class ApiMetricsService {
  async logApiRequest(
    request: Request,
    response: Response,
    startTime: number,
  ): Promise<void> {
    try {
      // Check if we're in test environment and if the connection is still active
      if (process.env.NODE_ENV === 'test' && !this.dataSource.isInitialized) {
        return;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      const log = new ApiRequestLog();
      log.method = request.method;
      log.path = request.path;
      log.statusCode = response.statusCode;
      log.duration = duration;
      log.timestamp = new Date();

      await this.apiRequestLogRepository.save(log);

      // Update metrics
      await this.updateMetrics(request.path, duration, response.statusCode);
    } catch (error) {
      // In test environment, suppress logging errors
      if (process.env.NODE_ENV !== 'test') {
        this.logger.error('Error logging API request:', error);
      }
    }
  }
}
