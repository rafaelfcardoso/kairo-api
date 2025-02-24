import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { SecurityLoggerService } from '../services/security-logger.service';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata('rateLimit', config);

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // Maximum requests per windowMs
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requestMap = new Map<string, number[]>();

  constructor(
    private readonly reflector: Reflector,
    private readonly securityLogger: SecurityLoggerService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const ip = request.ip;
    const endpoint = `${request.method} ${request.route.path}`;
    const now = Date.now();

    // Get rate limit config from decorator or use default
    const rateLimitConfig =
      this.reflector.get<RateLimitConfig>('rateLimit', handler) ||
      DEFAULT_RATE_LIMIT;

    const { windowMs, maxRequests } = rateLimitConfig;

    // Create a unique key for this IP and endpoint combination
    const key = `${ip}-${endpoint}`;

    // Initialize or get existing requests for this IP and endpoint
    const requests = this.requestMap.get(key) || [];

    // Remove requests outside the window
    const recentRequests = requests.filter((time) => now - time < windowMs);

    // Check if limit is exceeded
    if (recentRequests.length >= maxRequests) {
      this.securityLogger.logSuspiciousActivity(
        'Rate limit exceeded',
        'MEDIUM',
        {
          ip,
          endpoint,
          requestCount: recentRequests.length,
          windowMs,
          maxRequests,
        },
      );

      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too many requests',
          message: 'Please try again later',
          retryAfter: Math.ceil((windowMs - (now - recentRequests[0])) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request
    recentRequests.push(now);
    this.requestMap.set(key, recentRequests);

    // Clean up old entries periodically
    this.cleanup();

    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requestMap.entries()) {
      const recentRequests = requests.filter(
        (time) => now - time < DEFAULT_RATE_LIMIT.windowMs,
      );
      if (recentRequests.length === 0) {
        this.requestMap.delete(key);
      } else {
        this.requestMap.set(key, recentRequests);
      }
    }
  }
}
