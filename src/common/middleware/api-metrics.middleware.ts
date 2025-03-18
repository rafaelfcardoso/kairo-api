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
    try {
      // Record start time
      const startTime = Date.now();
      const responseSize = 0;

      // Add response header with API version
      res.setHeader('X-API-Version', '1.0');

      // Listen for 'finish' event which fires when the response has been sent
      res.on('finish', () => {
        try {
          // Calculate response time
          const responseTime = Date.now() - startTime;

          // Log metrics asynchronously
          setImmediate(() => {
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
              this.logger.error(
                `Error logging API metrics: ${error.message}`,
                error.stack,
              );
            }
          });
        } catch (error) {
          this.logger.error(
            `Error in API metrics finish handler: ${error.message}`,
          );
        }
      });

      // Continue to the next middleware
      next();
    } catch (error) {
      this.logger.error(
        `Error in API metrics middleware setup: ${error.message}`,
      );
      // Don't block the request if our middleware fails
      next();
    }
  }
}
