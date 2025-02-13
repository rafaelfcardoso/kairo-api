import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { SecurityLoggerService } from './services/security-logger.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { RequestSanitizerMiddleware } from './middleware/request-sanitizer.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

@Module({
  providers: [SecurityLoggerService, RateLimitGuard],
  exports: [SecurityLoggerService, RateLimitGuard],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, RequestSanitizerMiddleware)
      .forRoutes('*');
  }
}
