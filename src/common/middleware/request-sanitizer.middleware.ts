import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityLoggerService } from '../services/security-logger.service';
import xss from 'xss';

@Injectable()
export class RequestSanitizerMiddleware implements NestMiddleware {
  constructor(private readonly securityLogger: SecurityLoggerService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (req.body) {
      this.sanitizeObject(req.body);
    }

    if (req.query) {
      this.sanitizeObject(req.query);
    }

    if (req.params) {
      this.sanitizeObject(req.params);
    }

    next();
  }

  private sanitizeObject(obj: any) {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (typeof value === 'string') {
          // Sanitize string values
          const originalValue = value;
          const sanitizedValue = this.sanitizeValue(value);

          if (originalValue !== sanitizedValue) {
            this.securityLogger.logValidationFailure(
              originalValue,
              'Potentially malicious content sanitized',
              { key },
            );
          }

          obj[key] = sanitizedValue;
        } else if (typeof value === 'object' && value !== null) {
          // Recursively sanitize nested objects
          this.sanitizeObject(value);
        }
      }
    }
  }

  private sanitizeValue(value: string): string {
    // Remove null bytes
    let sanitized = value.replace(/\0/g, '');

    // Sanitize HTML and JavaScript
    sanitized = xss(sanitized, {
      whiteList: {}, // No tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style'],
    });

    // Remove potential SQL injection patterns
    sanitized = sanitized
      .replace(/(\b(select|insert|update|delete|drop|alter|exec)\b)/gi, '')
      .replace(/[;'"\\]/g, '');

    // Remove potential command injection patterns
    sanitized = sanitized
      .replace(/(\b(rm|shutdown|reboot|halt|kill)\b)/gi, '')
      .replace(/[&|`$]/g, '');

    return sanitized;
  }
}
