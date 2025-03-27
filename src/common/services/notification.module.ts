import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationDomainService } from '../../tasks/notification.domain.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [NotificationService, NotificationDomainService],
  exports: [NotificationService, NotificationDomainService],
})
export class NotificationModule {}
