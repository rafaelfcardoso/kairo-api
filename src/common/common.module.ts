import { Module } from '@nestjs/common';
import { SecurityLoggerService } from './services/security-logger.service';

@Module({
  providers: [SecurityLoggerService],
  exports: [SecurityLoggerService],
})
export class CommonModule {}
