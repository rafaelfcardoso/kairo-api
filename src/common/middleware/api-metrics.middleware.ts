import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiMetricsService } from '../../api-metrics/api-metrics.service';

/**
 * Middleware for tracking API requests and response times
 */
@Injectable()
export class ApiMetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiMetricsMiddleware.name);

  constructor(private apiMetricsService: ApiMetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Record start time
    const startTime = Date.now();

    // Add response header with API version
    res.setHeader('X-API-Version', '1.0');

    // Store original end function
    const originalEnd = res.end;
    const originalWrite = res.write;
    let responseSize = 0;

    // Override write to track response size
    res.write = function (chunk, ...args) {
      if (chunk) {
        responseSize += chunk.length;
      }
      return originalWrite.call(this, chunk, ...args);
    };

    // Override end function to log metrics
    res.end = function (chunk, ...args) {
      // Calculate response time
      const responseTime = Date.now() - startTime;

      // Restore original methods
      res.write = originalWrite;
      res.end = originalEnd;

      // Update response size if chunk provided in end()
      if (chunk) {
        responseSize += Buffer.from(chunk).length;
      }

      // Log metrics asynchronously (don't wait for completion)
      try {
        this.apiMetricsService
          .logApiRequest(req, res, responseTime, responseSize)
          .catch((error) => {
            this.logger.error(
              `Error logging API metrics: ${error.message}`,
              error.stack,
            );
          });
      } catch (error) {
        // Don't fail the request if metrics logging fails
        this.logger.error(
          `Error logging API metrics: ${error.message}`,
          error.stack,
        );
      }

      // Call original end function
      return originalEnd.call(this, chunk, ...args);
    }.bind(this);

    next();
  }
}
