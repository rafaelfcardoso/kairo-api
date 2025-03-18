import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { ApiErrorCode } from '../mcp.types';

/**
 * Exception filter to standardize error responses
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Catch and process HTTP exceptions
   *
   * @param exception The caught exception
   * @param host The arguments host
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse() as any;

    // Log the error with context
    this.logger.error(
      `HTTP Exception: ${status} - ${request.method} ${request.url}`,
      errorResponse?.stack || exception.stack,
    );

    // Map HTTP status to error code
    const errorCode = this.mapStatusToErrorCode(status);

    // Extract error details
    const title = this.getErrorTitle(status);
    const detail =
      typeof errorResponse === 'object'
        ? errorResponse.message || exception.message
        : exception.message;

    // For validation errors, include field information
    let source;
    if (status === HttpStatus.BAD_REQUEST && errorResponse.errors) {
      source = {
        pointer: `/data/attributes/${errorResponse.errors[0]?.field}`,
      };
    }

    // Create standardized error response
    const standardizedError = ResponseUtil.createError(
      status,
      errorCode,
      title,
      detail,
      source,
    );

    // Send standardized error response
    response
      .status(status)
      .json(ResponseUtil.createErrorResponse([standardizedError], request));
  }

  /**
   * Map HTTP status to error code
   *
   * @param status HTTP status code
   * @returns API error code
   */
  private mapStatusToErrorCode(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.INVALID_REQUEST;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.RESOURCE_CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ApiErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ApiErrorCode.INTERNAL_ERROR;
    }
  }

  /**
   * Get error title based on status code
   *
   * @param status HTTP status code
   * @returns Human-readable error title
   */
  private getErrorTitle(status: number): string {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return 'Resource Not Found';
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'Validation Error';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.CONFLICT:
        return 'Resource Conflict';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'Rate Limit Exceeded';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      default:
        return 'Internal Server Error';
    }
  }
}
