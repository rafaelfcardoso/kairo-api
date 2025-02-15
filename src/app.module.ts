import { Module } from '@nestjs/common';
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

        // Merge TypeORM configs
        const baseConfig = {
          type: 'postgres' as const,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: nodeEnv === 'local', // Only allow synchronize in local development
          logging: nodeEnv !== 'production', // Disable logging in production
          migrations: typeOrmConfig.migrations, // Include migrations from typeorm.config.ts
          migrationsRun: true,
          migrationsTableName: 'migrations',
        };

        // Return final config
        return {
          ...baseConfig,
          ...(dbConfig.url ? { url: dbConfig.url } : dbConfig),
        };
      },
      inject: [ConfigService],
    }),
    TasksModule,
    ProjectsModule,
    TagsModule,
    SecurityModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
