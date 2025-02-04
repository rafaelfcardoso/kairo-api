import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { TagsModule } from './tags/tags.module';
// import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host:
          configService.get('PGHOST') ||
          configService.get('DB_HOST') ||
          'localhost',
        port:
          parseInt(
            configService.get('PGPORT') || configService.get('DB_PORT'),
            10,
          ) || 5432,
        username:
          configService.get('PGUSER') ||
          configService.get('DB_USER') ||
          'postgres',
        password:
          configService.get('PGPASSWORD') ||
          configService.get('DB_PASS') ||
          'postgres',
        database:
          configService.get('PGDATABASE') ||
          configService.get('DB_NAME') ||
          'zenith',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TasksModule,
    ProjectsModule,
    TagsModule,
    // AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
