import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { TagsModule } from './tags/tags.module';
import { SecurityModule } from './common/security.module';
import { AppController } from './app.controller';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        const nodeEnv = configService.get('nodeEnv');

        console.log('Full config:', configService.get(undefined));

        if (!dbConfig) {
          console.error('Available configuration:', {
            nodeEnv,
            configKeys: Object.keys(configService.get(undefined) || {}),
          });
          throw new Error(
            'Database configuration is missing. Check your environment variables and configuration.',
          );
        }

        // Log database configuration (excluding sensitive data)
        console.log('Database Configuration:', {
          environment: nodeEnv,
          host: dbConfig.url ? '(Using connection URL)' : dbConfig.host,
          port: dbConfig.url ? '(Using connection URL)' : dbConfig.port,
          database: dbConfig.url ? '(Using connection URL)' : dbConfig.database,
          ssl: dbConfig.ssl,
        });

        // Base TypeORM config
        const typeOrmConfig = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: nodeEnv === 'local', // Only allow synchronize in local development
          logging: nodeEnv !== 'production', // Disable logging in production
        };

        // If using connection URL
        if (dbConfig.url) {
          return {
            ...typeOrmConfig,
            url: dbConfig.url,
            ssl: dbConfig.ssl,
          };
        }

        // Validate required database parameters
        const requiredParams = ['host', 'port', 'username', 'database'];
        for (const param of requiredParams) {
          if (!dbConfig[param]) {
            throw new Error(`Missing required database parameter: ${param}`);
          }
        }

        // If using individual connection parameters
        return {
          ...typeOrmConfig,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          ssl: dbConfig.ssl,
        };
      },
      inject: [ConfigService],
    }),
    SecurityModule,
    TasksModule,
    ProjectsModule,
    TagsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
