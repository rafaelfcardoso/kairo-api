import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);

  logSecurityEvent(event: string, metadata: Record<string, any> = {}) {
    this.logger.log({
      type: 'SECURITY_EVENT',
      event,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }

  logValidationFailure(
    input: string,
    reason: string,
    metadata: Record<string, any> = {},
  ) {
    this.logger.warn({
      type: 'VALIDATION_FAILURE',
      input,
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
    this.logger.error({
      type: 'SUSPICIOUS_ACTIVITY',
      activity,
      severity,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}
