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
      useFactory: (configService: ConfigService) => {
        // Check if DATABASE_PUBLIC_URL is provided
        const databaseUrl = process.env.DATABASE_PUBLIC_URL;

        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
            logging: true,
            ssl:
              process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false,
          };
        }

        // Fallback to individual connection parameters
        const dbConfig = {
          type: 'postgres' as const,
          host: process.env.PGHOST || configService.get('DB_HOST'),
          port: parseInt(
            process.env.PGPORT || configService.get('DB_PORT'),
            10,
          ),
          username: process.env.PGUSER || configService.get('DB_USER'),
          password: process.env.PGPASSWORD || configService.get('DB_PASS'),
          database: process.env.PGDATABASE || configService.get('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: true,
          ssl:
            process.env.NODE_ENV === 'production'
              ? { rejectUnauthorized: false }
              : false,
        };

        console.log('Database Configuration:', {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          username: dbConfig.username,
          ssl: dbConfig.ssl,
        });

        return dbConfig;
      },
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
