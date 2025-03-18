import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor to add API versioning headers to responses
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  /**
   * Current API version
   */
  private readonly API_VERSION = '1.0';

  /**
   * Intercept method to add version headers to response
   *
   * @param context Execution context
   * @param next Next handler in the chain
   * @returns Observable of the response
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();

        // Add API version headers
        response.header('X-API-Version', this.API_VERSION);

        // Add deprecation header if needed in the future
        // response.header('X-API-Deprecated', 'true');

        // Add other useful headers
        response.header('X-API-Documentation', '/api');
      }),
    );
  }
}
