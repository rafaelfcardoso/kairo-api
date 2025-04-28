import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { TagsModule } from './tags/tags.module';
import { SecurityModule } from './common/security.module';
import { AppController } from './app.controller';
import configuration from './config/configuration';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { FocusSessionsModule } from './focus-sessions/focus-sessions.module';
import { StatsModule } from './stats/stats.module';
import { SchedulerModule } from './common/services/scheduler.module';
import { ApiMetricsModule } from './api-metrics/api-metrics.module';
import { ApiMetricsMiddleware } from './common/middleware/api-metrics.middleware';

// Only add HealthModule if not in test
declare const require: any;
const dynamicImports = [
  ConfigModule.forRoot({
    isGlobal: true,
    load: [configuration],
  }),
  TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => {
      console.log(
        `[AppModule] TypeORM is using database: ${typeOrmConfig.database}`,
      );
      return {
        ...typeOrmConfig,
        synchronize: false,
        migrationsRun: false,
      };
    },
    inject: [ConfigService],
  }),
  TasksModule,
  ProjectsModule,
  TagsModule,
  SecurityModule,
  AuthModule,
  FocusSessionsModule,
  StatsModule,
  SchedulerModule,
  ApiMetricsModule,
];
if (process.env.NODE_ENV !== 'test') {
  dynamicImports.push(require('./common/health/health.module').HealthModule);
}

@Module({
  imports: dynamicImports,
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiMetricsMiddleware).forRoutes('*');
  }
}
