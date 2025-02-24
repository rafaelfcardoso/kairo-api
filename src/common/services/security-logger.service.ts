import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);
  private eventCounts: Map<string, number> = new Map();
  private lastAggregation: number = Date.now();
  private readonly AGGREGATION_INTERVAL = 60000; // 1 minute
  private readonly SAMPLING_RATE =
    process.env.NODE_ENV === 'production' ? 0.1 : 1; // 10% sampling in production

  logSecurityEvent(event: string, metadata: Record<string, any> = {}) {
    if (this.shouldLog(event)) {
      this.logger.log({
        type: 'SECURITY_EVENT',
        event,
        timestamp: new Date().toISOString(),
        ...metadata,
      });
    } else {
      this.aggregateEvent(event);
    }
  }

  logValidationFailure(
    input: string,
    reason: string,
    metadata: Record<string, any> = {},
  ) {
    // Always log validation failures as they're important for security
    this.logger.warn({
      type: 'VALIDATION_FAILURE',
      input: this.sanitizeInput(input),
      reason,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logSuspiciousActivity(
    activity: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
    metadata: Record<string, any> = {},
  ) {
    // Always log suspicious activity
    this.logger.error({
      type: 'SUSPICIOUS_ACTIVITY',
      activity,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  private shouldLog(event: string): boolean {
    // Always log critical events
    if (this.isCriticalEvent(event)) {
      return true;
    }

    // Apply sampling for non-critical events
    return Math.random() < this.SAMPLING_RATE;
  }

  private isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'authentication_failure',
      'rate_limit_exceeded',
      'suspicious_activity',
      'validation_failure',
    ];
    return criticalEvents.some((e) => event.includes(e));
  }

  private aggregateEvent(event: string) {
    const count = this.eventCounts.get(event) || 0;
    this.eventCounts.set(event, count + 1);

    const now = Date.now();
    if (now - this.lastAggregation >= this.AGGREGATION_INTERVAL) {
      this.flushAggregatedEvents();
      this.lastAggregation = now;
    }
  }

  private flushAggregatedEvents() {
    for (const [event, count] of this.eventCounts.entries()) {
      this.logger.log({
        type: 'AGGREGATED_EVENTS',
        event,
        count,
        timestamp: new Date().toISOString(),
        interval: `${this.AGGREGATION_INTERVAL}ms`,
      });
    }
    this.eventCounts.clear();
  }

  private sanitizeInput(input: string): string {
    // Truncate long inputs to prevent log bloat
    const MAX_LENGTH = 100;
    if (input.length > MAX_LENGTH) {
      return `${input.substring(0, MAX_LENGTH)}...`;
    }
    return input;
  }
}
